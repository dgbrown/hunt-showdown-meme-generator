import Hat from "./modules/hat.js";
import SwappableSprite from "./modules/swappableSprite.js";
import TrackedKeyboardKey from "./modules/trackedKeyboardKey.js";

const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 600
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