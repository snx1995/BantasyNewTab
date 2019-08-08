(function (){
    const menu = document.querySelector("ul");

    menu.addEventListener("click", event => {
        chrome.notifications.create({
            message: "Hello world"
        });
        const el = event.target;
        switch (el.dataset.op) {
            case "add":
                chrome.tabs.getCurrent(tab => {
                    console.log(tab);
                    chrome.notifications.create({
                        message: "Hello world"
                    });
                });
            break;
            default:

            break;
        }
    })
})();