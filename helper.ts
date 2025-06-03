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

class Row {
	worksheet: number;
	rowPosition: string;
	rowData: Map<string, string>;

	constructor(DATA: Map<string, string>, ROWPOSITION: string, WORKSHEET?: number) {
		this.rowData = new Map(Object.entries(DATA));
		this.rowPosition = ROWPOSITION;
		this.worksheet = WORKSHEET ? WORKSHEET : -1;
	}

	getHTMLRowElement(keyset: string[]): HTMLElement {
		const tr = document.createElement("tr");
		tr.id = this.rowPosition;

		const defineRowIdx = document.createElement("td");
		defineRowIdx.className = "small rowIdx";
		defineRowIdx.innerHTML = `<input type="text" value="${this.rowPosition}" name="${this.rowPosition}" disabled>`;
		tr.appendChild(defineRowIdx);

		for (let i = 0; i < keyset.length; i++) {
			const td = document.createElement("td");
			const currentKey = keyset[i];
			const v = this.rowData.get(currentKey) == undefined ? "" : this.rowData.get(currentKey);
			td.className = isSmall(currentKey);
			td.innerHTML = `<input type="text" value="${v}" name="${currentKey}">`;
			tr.appendChild(td);
		}

		return tr;
	}
}
