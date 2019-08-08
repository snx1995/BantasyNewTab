(function (){
    const pageVar = {
        "engine": "google",
        "tags": [

        ],
        "editTriggerDelay": 500
    };

    const searchUrl = {
        google(keyword) {
            return "https://www.google.com/search?q=" + keyword;
        },
        baidu(keyword) {
            return "https://www.baidu.com/s?wd=" + keyword;
        },
        bing(keyword) {
            return "https://cn.bing.com/search?q=" + keyword;
        }
    }

    const vm = {

    }

    class Dialog {
        constructor(option) {
            const {
                title, 
                destroyOnClose = true, // TODO
                enterTriggerConfirm = true,
                name = "",
                url = "",
                onconfirm = () => this.hide()
            } = option;

            if (!title || typeof onconfirm != "function") throw new Error("无效的标题或onconfirm监听器");
            const modal = document.createElement("div");
            modal.className = "modal";

            this.modal = modal;
            this.destroyOnClose = destroyOnClose;
            modal.innerHTML = `
            <div class="overlay"></div>
            <div class="modal-dialog">
                <h2>${title}</h2>
                <table>
                    <tr>
                        <td>名称：</td>
                        <td><input type="text" class="name-input" value="${name}"></td>
                    </tr>
                    <tr>
                        <td>地址：</td>
                        <td><input type="text" class="url-input" value="${url}"></td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <div class="btn-group">
                                <div class="btn confirm">确认</div>
                                <div class="btn cancel">取消</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>`
            const overlay = modal.querySelector(".overlay");
            const urlInput = modal.querySelector(".url-input");
            const nameInput = modal.querySelector(".name-input");      
            const confirm = modal.querySelector(".confirm");
            const cancel = modal.querySelector(".cancel");

            confirm.addEventListener("click", event => {
                onconfirm(nameInput.value, urlInput.value);
            });

            overlay.addEventListener("click", event => this.hide());
            cancel.addEventListener("click", event => this.hide());
            modal.onclick = event => event.stopPropagation();
            
            if (enterTriggerConfirm) {
                modal.addEventListener("keydown", event => {
                    if (event.keyCode === 13) {
                        onconfirm(nameInput.value, urlInput.value);
                    }
                })
            }
            document.body.append(modal);
        }

        show() {
            this.modal.style.display = "block";
        }

        hide() {
            this.modal.style.display = "none";
            if (this.destroyOnClose) {
                this.modal.remove();
                delete this;
            }
        }
    }

    const tags = document.querySelector(".tags");
    const add = document.querySelector(".tag.add");
    const engineList = document.querySelector(".search .btn ul");
    const searchBtn = document.querySelector(".search .btn span");
    const searchLabel = document.querySelector(".search .btn label");
    const searchInput = document.querySelector(".search > input");

    const addDialog = new Dialog({
        title: "添加新的标签",
        destroyOnClose: false,
        onconfirm(name, href) {
            if (name && href) {
                if (vm[href]) {
                    alert("地址已存在！");
                    return;
                }
                const tag = {name, href};
                pageVar.tags.push(tag);
                chrome.storage.sync.set({tags: pageVar.tags});
                const tagv = newTag(tag);
                add.before(tagv);
                vm[href] = tagv;
                addDialog.hide();
            } else alert("名称和地址都不能为空！");

        }
    })

    document.body.addEventListener("click", event => {
        if (tags.matches(".editing")) tags.classList.remove("editing");
    })

    add.addEventListener("click", () => {
        addDialog.show();
    });

    searchBtn.addEventListener("click", search);
    searchInput.addEventListener("keydown", event => {
        if (event.keyCode == 13) search();
    })

    engineList.addEventListener("click", event => {
        event.stopPropagation();
        pageVar.engine = event.target.innerText;
        chrome.storage.sync.set({engine: pageVar.engine});
        searchBtn.innerText = pageVar.engine;
        searchLabel.click();
    })

    chrome.storage.sync.get(["engine", "tags"], result => {
        if (result.engine) {
            pageVar.engine = result.engine;
            searchBtn.innerText = pageVar.engine;
        }
        if (result.tags) {
            pageVar.tags = result.tags;
            result.tags.forEach(e => {
                const tag = newTag(e);
                add.before(tag);

                // sync data view map
                vm[e.href] = tag;
            })
        }
    });

    function search() {
        const keyword = searchInput.value;
        if (keyword) {
            window.location = searchUrl[pageVar.engine](keyword);
        }
    }

    function newTag(tag) {
        const container = document.createElement("div");
        container.className = "container";

        const delBtn = document.createElement("span");
        delBtn.className = "del-btn";

        delBtn.addEventListener("click", event => {
            event.stopPropagation();
            
            if (confirm("确定删除 " + tag.name + " 吗？")) {
                for (let i = 0;i < pageVar.tags.length;i ++) {
                    if (pageVar.tags[i].href == tag.href) {
                        pageVar.tags.splice(i, 1);
                        chrome.storage.sync.set({tags: pageVar.tags});
                        container.remove();
                    }
                }
            }
        })

        const a = document.createElement("div");
        // a.href = tag.href;
        a.setAttribute("data-href", tag.href);
        a.className = "tag";

        const img = document.createElement("img");
        img.src = tag.href + "/favicon.ico";

        img.onerror = () => {
            img.remove();
            span.className = "no-img";
        }

        const span = document.createElement("span");
        span.className = "tag-name";
        span.innerText = tag.name;

        let timer;
        let flag = false;

        a.addEventListener("mousedown", event => {
            timer = setTimeout(() => {
                tags.classList.add("editing");
                flag = true;
            }, pageVar.editTriggerDelay);
        });

        a.addEventListener("mouseup", event => {
            if (flag) {
                flag = false;
            } else if (tags.matches(".editing")) {
                clearTimeout(timer);                
                const preName = span.innerText;
                const preUrl = a.getAttribute("data-href");
                const dialog = new Dialog({
                    title: `编辑 ${preName}`,
                    name: preName,
                    url: preUrl,
                    onconfirm(name, url) {
                        span.innerText = name;
                        a.setAttribute("data-href", url);
                        img.src = url + "/favicon.ico";

                        for (let i = 0;i < pageVar.tags.length;i ++) {
                            if (pageVar.tags[i].href == preUrl) {
                                pageVar.tags[i] = {
                                    name: name,
                                    href: url
                                }
                                chrome.storage.sync.set({tags: pageVar.tags});
                                break;
                            }
                        }
                        dialog.hide();
                    }
                })
                dialog.show();
            } else {
                clearTimeout(timer);
                window.location = a.getAttribute("data-href");
            }
        })

        a.onclick = event => event.stopPropagation();

        a.appendChild(img);
        a.appendChild(span);
        container.append(delBtn);
        container.append(a);
        return container;
    }

    
})()