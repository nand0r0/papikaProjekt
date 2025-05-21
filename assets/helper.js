"use strict";
function openModal() {
    const modal = document.getElementById("modal");
    modal.showModal();
}
function closeModal() {
    const modal = document.getElementById("modal");
    modal.close();
}
function max(numberArray) {
    if (numberArray.length == 0) {
        return -1;
    }
    let maxNum = numberArray[0];
    numberArray.forEach((num) => {
        if (num > maxNum) {
            maxNum = num;
        }
    });
    return maxNum;
}
