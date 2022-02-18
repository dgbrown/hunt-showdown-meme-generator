import * as PIXI from './vendor/pixi.mjs'

export const handles = []

const HANDLE_SIZE_DEFAULT = 13;
const HANDLE_HITAREA_MULTIPLIER = 2;

class RotationHandle extends PIXI.Graphics {
    constructor(diameter = HANDLE_SIZE_DEFAULT){
        super();
        this.interactive = true;
        this.lineStyle(1, 0x000000);
        this.beginFill(0xFFFFFF);
        this.drawCircle(0, 0, diameter * 0.5);
        this.endFill();
        const hitSize = diameter * HANDLE_HITAREA_MULTIPLIER;
        this.hitArea = new PIXI.Rectangle(hitSize * -0.5, hitSize * -0.5, hitSize, hitSize)
        handles.push(this);
    }
}

class ScaleHandle extends PIXI.Graphics {
    constructor(size = HANDLE_SIZE_DEFAULT){
        super();
        this.interactive = true;
        this.lineStyle(1, 0x000000);
        this.beginFill(0xFFFFFF);
        this.drawRect(size * -0.5, size * -0.5, size, size);
        this.endFill();
        const hitSize = size * HANDLE_HITAREA_MULTIPLIER;
        this.hitArea = new PIXI.Rectangle(hitSize * -0.5, hitSize * -0.5, hitSize, hitSize)
        handles.push(this);
    }
}

export class SpriteWithHandles extends PIXI.Graphics {
    maintainAspectRatio = true;
    isFocused = false;
    onFocus;
    onPointerDown;
    onPointerUp;

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
        //this.#sprite.buttonMode = true;
        this.#sprite.cursor = 'move'
        this.#sprite.anchor.set(0.5);
        this.#sprite.on('pointerdown', (event) => {
            event.data.originalEvent.preventDefault(); // disable browser default touch behaviour
            this.focus()
            this.#isBeingDragged = true;
            this.#dragEventData = event.data;
            const pointerPosition = this.#dragEventData.getLocalPosition(this.parent)
            this.#dragPositionOffset = {
                x: pointerPosition.x - this.x,
                y: pointerPosition.y - this.y
            }
            if(this.onPointerDown){
                this.onPointerDown(this);
            }
        });
        ['pointerup', 'pointerupoutside'].forEach((eventType) => {
            this.#sprite.on(eventType, (event) => {
                this.#isBeingDragged = false;
                this.#dragEventData = null;
                if(this.onPointerUp){
                    this.onPointerUp(this);
                }
            });
        });
        this.addChild(this.#sprite);

        this.#topLeftRotationHandle = new RotationHandle();
        this.#topLeftRotationHandle.buttonMode = true;
        this.#topRightRotationHandle = new RotationHandle();
        this.#topRightRotationHandle.buttonMode = true;
        this.#bottomRightRotationHandle = new RotationHandle();
        this.#bottomRightRotationHandle.buttonMode = true;
        this.#bottomLeftRotationHandle = new RotationHandle();
        this.#bottomLeftRotationHandle.buttonMode = true;
        [this.#topLeftRotationHandle, this.#topRightRotationHandle, this.#bottomRightRotationHandle, this.#bottomLeftRotationHandle].forEach((handle) => {
            this.#handles.push(handle)
            handle.on('pointerdown', (event) => {
                event.data.originalEvent.preventDefault(); // disable browser default touch behaviour
                this.onRotationHandleDragStart(handle, event.data)
                if(this.onPointerDown){
                    this.onPointerDown(this)
                }
            });
            ['pointerup', 'pointerupoutside'].forEach((eventType) => {
                handle.on(eventType, (event) => {
                    this.onRotationHandleDragStop(handle);
                    if(this.onPointerUp){
                        this.onPointerUp(this);
                    }
                })
            });
        })

        this.#topScaleHandle = new ScaleHandle();
        this.#topScaleHandle.cursor = 'ns-resize';
        this.#rightScaleHandle = new ScaleHandle();
        this.#rightScaleHandle.cursor = 'ew-resize';
        this.#bottomScaleHandle = new ScaleHandle();
        this.#bottomScaleHandle.cursor = 'ns-resize';
        this.#leftScaleHandle = new ScaleHandle();
        this.#leftScaleHandle.cursor = 'ew-resize';
        [this.#topScaleHandle, this.#rightScaleHandle, this.#bottomScaleHandle, this.#leftScaleHandle].forEach((handle) => {
            this.#handles.push(handle);
            handle.on('pointerdown', (event) => {
                event.data.originalEvent.preventDefault(); // disable browser default touch behaviour
                this.onScaleHandleDragStart(handle, event.data);
                if(this.onPointerDown){
                    this.onPointerDown(this);
                }
            });
            ['pointerup', 'pointerupoutside'].forEach((eventType) => {
                handle.on(eventType, (event) => {
                    this.onScaleHandleDragStop(handle);
                    if(this.onPointerUp){
                        this.onPointerUp(this);
                    }
                })
            });
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
    get spriteScale() {
        return this.#sprite.scale;
    }
    get spriteTexture() {
        return this.#sprite.texture;
    }
    get spriteBlendMode() {
        return this.#sprite.blendMode;
    }
    set spriteBlendMode(value) {
        this.#sprite.blendMode = value;
    }
    get spriteAlpha() {
        return this.#sprite.alpha;
    }
    set spriteAlpha(value) {
        this.#sprite.alpha = value;
    }
}

export default SpriteWithHandles