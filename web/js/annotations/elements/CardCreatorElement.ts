
export class CardCreatorElement extends HTMLElement {

    constructor() {

        super();

        // let importDoc = document.currentScript.ownerDocument;
        //
        // let template = importDoc.querySelector("template");
        //
        // //let cloneElement = this.importNode(template.content, true);
        let shadowRoot = this.attachShadow({mode: 'open'});

        let textElement = document.createElement("div");
        textElement.textContent = "hello world";

        shadowRoot.appendChild(textElement);

    }

}
