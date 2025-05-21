function openModal() {
	const modal = document.getElementById("modal") as any;
	modal.showModal();
}

function closeModal() {
	const modal = document.getElementById("modal") as any;
	modal.close();
}

function max(numberArray: number[]): number {
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
