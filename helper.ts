function openModal() {
	const modal = document.getElementById("modal") as any;
	modal.showModal();
}

function closeModal() {
	const modal = document.getElementById("modal") as any;
	modal.close();
}

function prevPage(reset?: boolean) {
	const el = document.getElementById("prevPage") as HTMLButtonElement;

	if (reset) {
		if (CurrentPage == 0) {
			el.setAttribute("disabled", "");
		} else {
			el.removeAttribute("disabled");
		}
		return;
	}

	if (CurrentPage != 0) {
		CurrentPage--;
		switchPage(CurrentPage);
	}
}

function nextPage(reset?: boolean) {
	const el = document.getElementById("nextPage") as HTMLButtonElement;

	if (reset) {
		if (CurrentPage == MaxPages - 1) {
			el.setAttribute("disabled", "");
		} else {
			el.removeAttribute("disabled");
		}
	} else {
		if (CurrentPage != MaxPages - 1) {
			CurrentPage++;
			switchPage(CurrentPage);
		}
	}
}

function switchPage(page: number) {
	drawDataInTable(PageData[page], Keys);
	prevPage(true);
	nextPage(true);
	PageCounter.innerHTML = `${page + 1}/${MaxPages}`;
}

class Row {
	rowData: Map<string, string>;

	constructor(DATA: Map<string, string>) {
		this.rowData = DATA;
	}
}
