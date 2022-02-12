class TrackedKeyboardKey {
    value;
    isDown = false;
    isUp = true;
    onPress;
    onRelease;
    #upHandler;
    #downHandler;
    constructor(value) {
        this.value = value;

        this.#downHandler = (event) => {
            if (event.key == this.value) {
                if (this.isUp && this.onPress) {
                    this.onPress();
                }
                this.isDown = true;
                this.isUp = false;
                event.preventDefault();
            }
        };

        this.#upHandler = (event) => {
            if (event.key == this.value) {
                if (this.isDown && this.onRelease) {
                    this.onRelease();
                }
                this.isDown = false;
                this.isUp = true;
                event.preventDefault();
            }
        };

        window.addEventListener("keydown", this.#downHandler, false);
        window.addEventListener("keyup", this.#upHandler, false);
    }
    unsubscribe() {
        window.removeEventListener("keydown", this.#downHandler);
        window.removeEventListener("keyup", this.#upHandler);
    }
}

export default TrackedKeyboardKey