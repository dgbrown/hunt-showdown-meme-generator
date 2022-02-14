import SwappableSprite from "./modules/swappableSprite.js";
import TrackedKeyboardKey from "./modules/trackedKeyboardKey.js";
import SpriteWithHandles, { handles } from './modules/spriteWithHandles.js'

const CANVAS_WIDTH = 128
const CANVAS_HEIGHT = 128
const CANVAS_BACKGROUND_COLOR = 0x222222

document.addEventListener("DOMContentLoaded", (event) => {
    let hatTextures = [
        PIXI.Texture.from('images/stamps/hat01.png'),
        PIXI.Texture.from('images/stamps/hat02.png'),
        PIXI.Texture.from('images/stamps/hat03.png'),
        PIXI.Texture.from('images/stamps/hat04.png'),
        PIXI.Texture.from('images/stamps/hat05.png'),
        PIXI.Texture.from('images/stamps/hat06.png')
    ]
    
    let app = new PIXI.Application({ 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT, 
        backgroundColor: CANVAS_BACKGROUND_COLOR, 
        preserveDrawingBuffer: true // so we can extract the buffer for download
    });
    document.getElementById('pixi-app-container').appendChild(app.view);

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

    const resizeApp = (() => {
        let handleResizeTimeoutHandle;
        const _resizeApp = () => {
            const width = uploadedImageSprite?.originalWidth
            const height = uploadedImageSprite?.originalHeight
            if(width + height > 0){
                let ratio = height / width;
                const newWidth = Math.min(width, window.innerWidth)
                const newHeight = newWidth * ratio
                app.renderer.resize(newWidth, newHeight);

                let scale = Math.min(newWidth / width, 1)
                app.stage.scale.set(scale)
                const handleScale = 1/scale
                handles.forEach((handle) => handle.scale.set(handleScale))
            }
        }
        return (debounceMs = 100) => {
            if(handleResizeTimeoutHandle){
                clearTimeout(handleResizeTimeoutHandle)
            }
            if(debounceMs){
                handleResizeTimeoutHandle = setTimeout(_resizeApp, debounceMs)
            }else{
                _resizeApp()
            }
        }
    })()

    window.addEventListener('resize', () => {
        resizeApp()
    });

    // on meme chosen
    document.getElementById('upload-btn').addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileDataURL = event.target.result;
            const loader = PIXI.Loader.shared;
            loader.add('upload', fileDataURL)
            loader.load((loader, resources) => {
                uploadedImageSprite.setSprite(PIXI.Sprite.from(fileDataURL))
                resizeApp(0)

                document.getElementById('start-layout').style.display = 'none';
                document.getElementById('hat-bar').style.display = null;
                document.getElementById('pixi-app-container').style.display = null;
                document.getElementById('bottom-btn-bar').style.display = null;
            })
        }
        reader.readAsDataURL(file)
    });

    // only one hat focused at a time
    const onHatFocused = (hat) => {
        hats.forEach((x) => x === hat || x.unfocus())
    }

    // add new hat
    document.getElementById('add-hat-btn').addEventListener('click', (event) => {
        let selectedHatElem = document.querySelector('input[name=hat]:checked')
        if(selectedHatElem === null){
            console.log('no hat selected but tried to add hat')
            return;
        }
        let hatTextureIndex = parseInt(selectedHatElem.value)
        let hatTexture = hatTextures[hatTextureIndex]
        let inverseStageScale = 1/app.stage.scale.x
        let hat = new SpriteWithHandles(hatTexture, inverseStageScale, onHatFocused, debugGraphics)
        hat.x = app.renderer.width * 0.5 * inverseStageScale
        hat.y = app.renderer.height * 0.5 * inverseStageScale
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
    const deleteHatKey = new TrackedKeyboardKey('Delete')
    deleteHatKey.onPress = () => {
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
    const resetHatKey = new TrackedKeyboardKey('r')
    resetHatKey.onPress = () => {
        let hat = hats.find((x) => x.isFocused)
        if(hat){
            hat.resetAdjustments()
        }
    }

    // flip focused hat (horizontally)
    const flipHatHorizontalKey = new TrackedKeyboardKey('f')
    flipHatHorizontalKey.onPress = () => {
        let hat = hats.find((x) => x.isFocused)
        if(hat){
            hat.flipHorizontal()
        }
    }

    // unfocus all
    const unfocusKey = new TrackedKeyboardKey('Escape');
    unfocusKey.onPress = () => hats.forEach((x) => x.unfocus())

    // pixi update
    let elapsedTime = 0
    app.ticker.add((deltaTime) => {
        elapsedTime += deltaTime
        debugGraphics.clear()
        hats.forEach((hat) => hat.update(deltaTime))
    })
});