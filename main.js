const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 600
const CANVAS_BACKGROUND_COLOR = 0x222222

class RotationHandle extends PIXI.Graphics {
    constructor(diameter = 10){
        super()
        this.interactive = true;
        this.buttonMode = true;
        this.lineStyle(1, 0x000000);
        this.beginFill(0xFFFFFF)
        this.drawCircle(0, 0, diameter * 0.5)
        this.endFill()
    }
}

class ScaleHandle extends PIXI.Graphics {
    constructor(size = 10){
        super()
        this.interactive = true;
        this.buttonMode = true;
        this.lineStyle(1, 0x000000);
        this.beginFill(0xFFFFFF)
        this.drawRect(size * -0.5, size * -0.5, size, size)
        this.endFill()
    }
}

class SpriteWithHandles extends PIXI.Graphics {
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

    isFocused = false;
    #onFocus;
    #debugGraphics;
    constructor(texture, onFocus, debugGraphics){
        super()
        if(debugGraphics){
            this.#debugGraphics = debugGraphics
        }

        this.#onFocus = onFocus;

        this.#sprite = new PIXI.Sprite(texture)
        this.#sprite.interactive = true;
        this.#sprite.buttonMode = true;
        this.#sprite.anchor.set(0.5);
        //this.#sprite.scale.set(0.5);
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
            this.addChild(handle);
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

            const maintainAspectRatio = true;
            const isHorizontal = this.#draggedScaleHandle === this.#leftScaleHandle || this.#draggedScaleHandle === this.#rightScaleHandle
            if(isHorizontal){
                let newWidth = Math.abs(relativePosition.x * 2)
                if(maintainAspectRatio){
                    let ratio = this.#sprite.width / this.#sprite.height
                    this.#sprite.height = Math.abs(newWidth) * ratio
                }
                this.#sprite.width = newWidth
            }else{
                let newHeight = Math.abs(relativePosition.y * 2)
                if(maintainAspectRatio){
                    let ratio = this.#sprite.height / this.#sprite.width
                    this.#sprite.width = Math.abs(newHeight) * ratio
                }
                this.#sprite.height = newHeight
            }

            if(this.#sprite.scale.x < 0.1){
                this.#sprite.scale.x = 0.1
            }
            if(this.#sprite.scale.y < 0.1){
                this.#sprite.scale.y = 0.1
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
        if(this.#onFocus){
            this.#onFocus(this)
        }
        this.isFocused = true;
    }
}

class Hat extends SpriteWithHandles {}

class SwappableSprite extends PIXI.Graphics {
    #sprite;
    constructor() {
        super()
    }
    setSprite(sprite) {
        if(this.#sprite){
            this.removeChild(this.#sprite)
        }
        this.#sprite = sprite
        this.addChild(this.#sprite)
    }
}

class TrackedKeyboardKey {
    value;
    isDown = false;
    isUp = true;
    onPress;
    onRelease;
    #upHandler;
    #downHandler;
    constructor(value){
        this.value = value;

        this.#downHandler = (event) => {
            if (event.key == this.value) {
                if (this.isUp && this.onPress) {
                    this.onPress()
                }
                this.isDown = true;
                this.isUp = false;
                event.preventDefault();
            }
        }

        this.#upHandler = (event) => {
            if (event.key == this.value) {
                if (this.isDown && this.onRelease) {
                    this.onRelease()
                }
                this.isDown = false;
                this.isUp = true;
                event.preventDefault();
            }
        }

        window.addEventListener("keydown", this.#downHandler, false);
        window.addEventListener("keyup", this.#upHandler, false);
    }
    unsubscribe() {
        window.removeEventListener("keydown", this.#downHandler);
        window.removeEventListener("keyup", this.#upHandler);
    }
}

document.addEventListener("DOMContentLoaded", (event) => {
    let hatTextures = [
        PIXI.Texture.from('images/stamps/hat01.png'),
        PIXI.Texture.from('images/stamps/hat02.png'),
        PIXI.Texture.from('images/stamps/hat03.png'),
        PIXI.Texture.from('images/stamps/hat04.png'),
        PIXI.Texture.from('images/stamps/hat05.png'),
        PIXI.Texture.from('images/stamps/hat06.png')
    ]
    
    let app = new PIXI.Application({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: CANVAS_BACKGROUND_COLOR, preserveDrawingBuffer: true });
    document.getElementById('piji-app-container').appendChild(app.view);

    let uploadedImageSprite = new SwappableSprite()
    uploadedImageSprite.interactive = true
    uploadedImageSprite.on('pointerdown', (event) => {
        hats.forEach((hat) => {
            hat.unfocus()
        })
    })
    app.stage.addChild(uploadedImageSprite)

    let debugGraphics = new PIXI.Graphics();
    app.stage.addChild(debugGraphics)

    let hats = []

    const onHatFocused = (hat) => {
        hats.forEach((x) => x === hat || x.unfocus())
    }

    document.getElementById('upload-btn').addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileDataURL = event.target.result;
            uploadedImageSprite.setSprite(PIXI.Sprite.from(fileDataURL))
        }
        reader.readAsDataURL(file)

        document.getElementById('start-layout').style.display = 'none';
        document.getElementById('full-layout').style.display = 'initial';
    });

    // add new hat
    document.getElementById('add-hat-btn').addEventListener('click', (event) => {
        let selectedHatElem = document.querySelector('input[name=hat]:checked')
        if(selectedHatElem === null){
            console.log('no hat selected but tried to add hat')
            return;
        }
        let hatTextureIndex = parseInt(selectedHatElem.value)
        let hatTexture = hatTextures[hatTextureIndex]
        let hat = new Hat(hatTexture, onHatFocused, debugGraphics)
        hat.x = CANVAS_WIDTH * 0.5
        hat.y = CANVAS_HEIGHT * 0.5
        hats.push(hat)
        app.stage.addChild(hat)
        hat.focus()
    })

    // export img
    document.getElementById('export-btn').addEventListener('click', (event) => {
        let focusedHat = hats.find((x) => x.isFocused)
        focusedHat?.unfocus()
        app.render()

        var tmpDownloadLink = document.createElement('a');
        tmpDownloadLink.setAttribute('href', app.renderer.plugins.extract.base64());
        tmpDownloadLink.setAttribute('download', 'huntmeme');
        tmpDownloadLink.style.display = 'none';
        document.body.appendChild(tmpDownloadLink);
        tmpDownloadLink.click();
        document.body.removeChild(tmpDownloadLink);

        focusedHat?.focus()
    })
    

    // delete focused hat
    const deleteKey = new TrackedKeyboardKey('Delete')
    deleteKey.onPress = () => {
        let hatIndex = hats.findIndex((x) => x.isFocused)
        if(hatIndex >= 0){
            let hat = hats[hatIndex]
            app.stage.removeChild(hat)
            hats.splice(hatIndex, 1)
            hat.destroy()
            hat = null
        }
    }

    // reset focused hat
    const rKey = new TrackedKeyboardKey('r')
    rKey.onPress = () => {
        let hat = hats.find((x) => x.isFocused)
        if(hat){
            hat.scale.x = hat.scale.y = 1
            hat.rotation = 0
        }
    }

    let elapsedTime = 0
    app.ticker.add((deltaTime) => {
        elapsedTime += deltaTime
        debugGraphics.clear()
        hats.forEach((hat) => hat.update(deltaTime))
    })
});