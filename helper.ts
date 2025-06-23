class Row {
	sheet: string;
	position: string;
	data: Map<string, string>;

	constructor(data: Map<string, string>, position: string, sheet: string) {
		this.data = new Map(Object.entries(data));
		this.position = position;
		this.sheet = sheet;
	}

	getHTMLRowElement(keyset: string[]): HTMLElement {
		const tr = document.createElement("tr");
		tr.id = `${this.sheet}; ${this.position}`;

		const defineRowSection = document.createElement("td");
		const defineRowIdx = document.createElement("td");
		defineRowSection.className = "small rowIdx";
		defineRowIdx.className = "small rowIdx";
		defineRowSection.innerHTML = `<input type="text" value="${this.sheet}" name="${this.sheet}" disabled>`;
		defineRowIdx.innerHTML = `<input type="text" value="${this.position}" name="${this.position}" disabled>`;
		tr.appendChild(defineRowSection);
		tr.appendChild(defineRowIdx);

		for (let i = 0; i < keyset.length; i++) {
			const td = document.createElement("td");
			const currentKey = keyset[i];
			if (this.data.get(currentKey) == undefined) {
				td.innerHTML = `<input type="text" disabled name="${currentKey}">`;
			} else {
				const v = this.data.get(currentKey) == undefined ? "" : this.data.get(currentKey);
				td.innerHTML = `
				<input type="text" value="${v}" name="${currentKey}" 
				onfocusout="cacheRow(this.parentElement.parentElement.id, this.name, this.value)">
				`;
			}
			td.className = isSmall(currentKey);
			tr.appendChild(td);
		}

		return tr;
	}

	getStrippedData(): Map<string, string> {
		let result = new Map<string, string>(this.data.entries());
		this.data.forEach((value, key) => {
			if (value == "") {
				result.delete(key);
			}
		});
		return result;
	}

	setData(key: string, value: string) {
		this.data.set(key, value);
	}

	getRowDataAsObject(): { [key: string]: string } {
		return Object.fromEntries(this.data.entries());
	}
}

function openModal(modalId: string) {
	const modal = document.getElementById(modalId) as any;
	modal.showModal();
}

function closeModal(modalId: string) {
	const modal = document.getElementById(modalId) as any;
	modal.close();
}

function prevPage(reset?: boolean) {
	const el = document.getElementById("prevPage") as HTMLButtonElement;

	if (reset) {
		if (_CurrentPage == 0) {
			el.setAttribute("disabled", "");
		} else {
			el.removeAttribute("disabled");
		}
		return;
	}

	if (_CurrentPage != 0) {
		_CurrentPage--;
		switchPage(_CurrentPage);
	}
}

function nextPage(reset?: boolean) {
	const el = document.getElementById("nextPage") as HTMLButtonElement;

	if (reset) {
		if (_CurrentPage == MaxPages - 1) {
			el.setAttribute("disabled", "");
		} else {
			el.removeAttribute("disabled");
		}
	} else {
		if (_CurrentPage != MaxPages - 1) {
			_CurrentPage++;
			switchPage(_CurrentPage);
		}
	}
}

function blurDocument(blur: boolean) {
	if (blur) {
		document.body.style = "filter: blur(5px)";
	} else {
		document.body.style = "";
	}
}

async function reloadFile() {
	blurDocument(true);
	const resp = await fetch("http://localhost:8080/reloadFile/", {
		method: "POST",
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		},
	});
	blurDocument(false);
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
