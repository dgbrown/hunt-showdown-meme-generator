export const handles = []

class RotationHandle extends PIXI.Graphics {
    constructor(diameter = 10){
        super();
        this.interactive = true;
        this.buttonMode = true;
        this.lineStyle(1, 0x000000);
        this.beginFill(0xFFFFFF);
        this.drawCircle(0, 0, diameter * 0.5);
        this.endFill();
        handles.push(this);
    }
}

class ScaleHandle extends PIXI.Graphics {
    constructor(size = 10){
        super();
        this.interactive = true;
        this.buttonMode = true;
        this.lineStyle(1, 0x000000);
        this.beginFill(0xFFFFFF);
        this.drawRect(size * -0.5, size * -0.5, size, size);
        this.endFill();
        handles.push(this);
    }
}

export class SpriteWithHandles extends PIXI.Graphics {
    maintainAspectRatio = true;
    isFocused = false;
    onFocus;

    #sprite;

    #isBeingDragged = false;
    #dragPositionOffset = {
        x: 0,
        y: 0
    };
    #dragEventData;

    #handles = []

    #isRotationHandleBeingDragged = false;
    #rotationHandleDragEventData;
    #draggedRotationHandle;
    #topLeftRotationHandle;
    #topRightRotationHandle;
    #bottomRightRotationHandle;
    #bottomLeftRotationHandle;
    #dragStartRotation;
    #dragAnchorStartRotation; // relative angle of the pointer event coords

    #isScaleHandleBeingDragged = false;
    #scaleHandleDragEventData;
    #draggedScaleHandle;
    #topScaleHandle;
    #rightScaleHandle;
    #bottomScaleHandle;
    #leftScaleHandle;
    #scaleDragStartRelativeSign
    #scaleDragStartFlip
    #scaleDragDimRatio
    #scaleDragIsHorizontal

    #debugGraphics;
    constructor(texture, handleScale = 1, debugGraphics){
        super()
        if(debugGraphics){
            this.#debugGraphics = debugGraphics
        }

        this.#sprite = new PIXI.Sprite(texture)
        this.#sprite.interactive = true;
        this.#sprite.buttonMode = true;
        this.#sprite.anchor.set(0.5);
        this.#sprite.on('pointerdown', (event) => {
            this.focus()
            this.#isBeingDragged = true;
            this.#dragEventData = event.data;
            const pointerPosition = this.#dragEventData.getLocalPosition(this.parent)
            this.#dragPositionOffset = {
                x: pointerPosition.x - this.x,
                y: pointerPosition.y - this.y
            }
        });
        this.#sprite.on('pointerup', (event) => {
            this.#isBeingDragged = false
            this.#dragEventData = null
        });
        this.addChild(this.#sprite);

        this.#topLeftRotationHandle = new RotationHandle();
        this.#topRightRotationHandle = new RotationHandle();
        this.#bottomRightRotationHandle = new RotationHandle();
        this.#bottomLeftRotationHandle = new RotationHandle();
        [this.#topLeftRotationHandle, this.#topRightRotationHandle, this.#bottomRightRotationHandle, this.#bottomLeftRotationHandle].forEach((handle) => {
            this.#handles.push(handle)
            handle.on('pointerdown', (event) => this.onRotationHandleDragStart(handle, event.data))
            handle.on('pointerup', (event) => this.onRotationHandleDragStop(handle))
            handle.on('pointerupoutside', (event) => this.onRotationHandleDragStop(handle))
        })

        this.#topScaleHandle = new ScaleHandle();
        this.#rightScaleHandle = new ScaleHandle();
        this.#bottomScaleHandle = new ScaleHandle();
        this.#leftScaleHandle = new ScaleHandle();
        [this.#topScaleHandle, this.#rightScaleHandle, this.#bottomScaleHandle, this.#leftScaleHandle].forEach((handle) => {
            this.#handles.push(handle)
            handle.on('pointerdown', (event) => this.onScaleHandleDragStart(handle, event.data))
            handle.on('pointerup', (event) => this.onScaleHandleDragStop(handle))
            handle.on('pointerupoutside', (event) => this.onScaleHandleDragStop(handle))
        })

        this.#handles.forEach((handle) => {
            handle.scale.set(handleScale)
            this.addChild(handle);
        })

        this.hideHandles()
    }
    update(deltaTime) {
        if(this.#isBeingDragged && this.#dragEventData){
            let dragAnchorPosition = this.#dragEventData.getLocalPosition(this.parent);
            this.x = dragAnchorPosition.x - this.#dragPositionOffset.x;
            this.y = dragAnchorPosition.y - this.#dragPositionOffset.y;
        }

        this.#topLeftRotationHandle.x = this.#sprite.width * -0.5;
        this.#topLeftRotationHandle.y = this.#sprite.height * -0.5;
        this.#topRightRotationHandle.x = this.#sprite.width * 0.5;
        this.#topRightRotationHandle.y = this.#sprite.height * -0.5;
        this.#bottomRightRotationHandle.x = this.#sprite.width * 0.5;
        this.#bottomRightRotationHandle.y = this.#sprite.height * 0.5;
        this.#bottomLeftRotationHandle.x = this.#sprite.width * -0.5;
        this.#bottomLeftRotationHandle.y = this.#sprite.height * 0.5;

        this.#topScaleHandle.y = this.#sprite.height * -0.5
        this.#rightScaleHandle.x = this.#sprite.width * 0.5
        this.#bottomScaleHandle.y = this.#sprite.height * 0.5
        this.#leftScaleHandle.x = this.#sprite.width * -0.5

        if(this.#isRotationHandleBeingDragged && this.#rotationHandleDragEventData){
            let anchorRelativePosition = this.#rotationHandleDragEventData.getLocalPosition(this)
            let anchorRotation = Math.atan2(anchorRelativePosition.y, anchorRelativePosition.x)
            this.rotation = this.#dragStartRotation + (anchorRotation - this.#dragAnchorStartRotation)
        }

        if(this.#isScaleHandleBeingDragged && this.#scaleHandleDragEventData){
            let relativePosition = this.#scaleHandleDragEventData.getLocalPosition(this)

            let propNames = this.#scaleDragIsHorizontal ? {
                axis: 'x',
                primaryDim: 'width',
                secondaryDim: 'height',
            } : {
                axis: 'y',
                primaryDim: 'height',
                secondaryDim: 'width',
            }

            const flip = this.#scaleDragStartFlip * (this.#scaleDragStartRelativeSign !== Math.sign(relativePosition[propNames.axis]) ? -1 : 1)
            let newSize = Math.max(20, Math.abs(relativePosition[propNames.axis] * 2)) // x2 because we measure from the center of the sprite, and capped for safety to avoid collapse
            if(this.maintainAspectRatio){
                this.#sprite[propNames.secondaryDim] = Math.abs(newSize) * this.#scaleDragDimRatio
            }else{
                this.#scaleDragDimRatio = this.#sprite[this.#scaleDragIsHorizontal ? 'height' : 'width'] / this.#sprite[this.#scaleDragIsHorizontal ? 'width' : 'height']
            }
            this.#sprite[propNames.primaryDim] = newSize

            if(Math.sign(this.#sprite.scale[propNames.axis]) !== flip){
                this.#sprite.scale[propNames.axis] *= -1
            }
        }
    }
    onRotationHandleDragStart(handle, eventData){
        this.#isRotationHandleBeingDragged = true
        this.#rotationHandleDragEventData = eventData
        this.#draggedRotationHandle = handle;
        this.#dragStartRotation = this.rotation
        let anchorRelativePosition = this.#rotationHandleDragEventData.getLocalPosition(this)
        this.#dragAnchorStartRotation = Math.atan2(anchorRelativePosition.y, anchorRelativePosition.x)
    }
    onRotationHandleDragStop(handle){
        this.#isRotationHandleBeingDragged = false
        this.#rotationHandleDragEventData = null
        this.#draggedRotationHandle = null;
    }
    onScaleHandleDragStart(handle, eventData){
        this.#isScaleHandleBeingDragged = true
        this.#scaleHandleDragEventData = eventData
        this.#draggedScaleHandle = handle;
        this.#scaleDragIsHorizontal = this.#draggedScaleHandle === this.#leftScaleHandle || this.#draggedScaleHandle === this.#rightScaleHandle
        this.#scaleDragStartFlip = Math.sign(this.#scaleDragIsHorizontal ? this.#sprite.scale.x : this.#sprite.scale.y)
        this.#scaleDragStartRelativeSign = Math.sign(this.#scaleHandleDragEventData.getLocalPosition(this)[this.#scaleDragIsHorizontal ? 'x' : 'y'])
        this.#scaleDragDimRatio = this.#sprite[this.#scaleDragIsHorizontal ? 'height' : 'width'] / this.#sprite[this.#scaleDragIsHorizontal ? 'width' : 'height']
    }
    onScaleHandleDragStop(handle){
        this.#isScaleHandleBeingDragged = false
        this.#scaleHandleDragEventData = null
        this.#draggedScaleHandle = null
    }
    hideHandles() {
        this.#handles.forEach((handle) => handle.visible = false)
    }
    showHandles() {
        this.#handles.forEach((handle) => handle.visible = true)
    }
    unfocus() {
        this.hideHandles()
        this.isFocused = false;
    }
    focus() {
        this.showHandles()
        if(this.onFocus){
            this.onFocus(this)
        }
        this.isFocused = true;
    }
    resetAdjustments() {
        this.#sprite.scale.set(1)
        this.rotation = 0
    }
    flipHorizontal() {
        this.#sprite.scale.x *= -1
    }
    flipVertical() {
        this.#sprite.scale.y *= -1
    }
}

export default SpriteWithHandles