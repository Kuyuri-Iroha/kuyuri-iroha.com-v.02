{
'use strict'

let onInit = () => {
    let pcOnlyFunctions = [];

    //ID clickToEnterTheMenu
    let ua = navigator.userAgent;
    let isMobile = (ua.indexOf('Mobile') > 0 ||
                    ua.indexOf('iPhone') > 0 ||
                    ua.indexOf('iPod') > 0 ||
                    ua.indexOf('iPad') > 0 ||
                    ua.indexOf('Android') > 0 ||
                    ua.indexOf('Windows Phone') > 0);
    let enterMS = document.getElementById('clickToEnterTheMenu').children[0];
    let clickMS = enterMS.children[0];
    if(isMobile) {
        enterMS.children[0].className = 'off';
        enterMS.children[1].className = '';
        clickMS = enterMS.children[1];
    }
    pcOnlyFunctions.push(() => {
        let replaceEnterText = () =>  {
            clickMS.className = 'menuFirst transparent';
            enterMS.children[2].className = 'menuSecond';
        }
        let restoreEnterText = () => {
            clickMS.className = 'menuFirst';
            enterMS.children[2].className = 'menuSecond transparent';
        }
        enterMS.addEventListener('mouseover', replaceEnterText);
        enterMS.addEventListener('mouseout', restoreEnterText);
    });

    //PC only functions
    if(!isMobile) {
        for(let func of pcOnlyFunctions) {
            func();
        }
    }

    //ID loading
    let loadedFunc = () => {
        let loading = document.getElementById('pageLoading');
    
        loading.className = 'loading';
    }
    setTimeout(loadedFunc, 500);
}

window.addEventListener('DOMContentLoaded', onInit);

}