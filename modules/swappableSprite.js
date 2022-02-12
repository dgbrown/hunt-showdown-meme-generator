class SwappableSprite extends PIXI.Graphics {
    #sprite;
    constructor() {
        super();
    }
    setSprite(sprite) {
        if (this.#sprite) {
            this.removeChild(this.#sprite);
        }
        this.#sprite = sprite;
        this.addChild(this.#sprite);
    }
}

export default SwappableSprite