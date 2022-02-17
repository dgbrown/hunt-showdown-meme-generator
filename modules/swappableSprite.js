import * as PIXI from './vendor/pixi.mjs'

class SwappableSprite extends PIXI.Graphics {
    #sprite;
    #originalWidth;
    #originalHeight;
    constructor(sprite) {
        super();
        if(sprite){
            this.setSprite(sprite)
        }
    }
    setSprite(sprite) {
        if (this.#sprite) {
            this.removeChild(this.#sprite);
        }
        this.#sprite = sprite;
        this.#originalWidth = sprite.width;
        this.#originalHeight = sprite.height;
        this.addChild(this.#sprite);
    }
    get originalWidth() {
        return this.#originalWidth;
    }
    get originalHeight() {
        return this.#originalHeight;
    }
    get width() {
        return this.#sprite?.width;
    }
    set width(value) {
        if(this.#sprite){
            this.#sprite.width = value;
        }
    }
    get height() {
        return this.#sprite?.height;
    }
    set height(value) {
        if(this.#sprite){
            this.#sprite.height = value;
        }
    }
}

export default SwappableSprite