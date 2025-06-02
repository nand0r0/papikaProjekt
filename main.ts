//main Typescript file
type filterType = Map<string, string>;

//["col, row"][key, value]
type rowDataType = Map<string, Map<string, string>>;

const TitleWrapper = document.getElementById("titles") as HTMLElement;
const DataWrapper = document.getElementById("dataWrapper") as HTMLElement;
const DialogueFilterWrapper = document.getElementById("listWrapper") as HTMLElement;
const SectionsWrapper = document.getElementById("sections") as HTMLSelectElement;
const SearchBox = document.getElementById("searchBox") as HTMLInputElement;
const SearchButton = document.getElementById("searchButton") as HTMLButtonElement;
const PageCounter = document.getElementById("pageCounter") as HTMLElement;
const sectionCheckBox = document.getElementById("sectionCheckBox") as HTMLElement;

const MaxRowPerPage = 150;
let MaxPages = 0;
let PageData: rowDataType[][] = [];
let CurrentPage = 0;

let Keys: string[] = [];
let LoadedRows: Row[] = [];
let SavedRows: Row[] = [];

fetch("http://localhost:8080/base/")
	.then((resp) => resp.json())
	.then((json) => main(json));

function main(json: string[][]) {
	const Filters: string[] = json[0];
	const Sections: string[] = json[1];

	//section titles

	//adds the elements to the search parameters inside the modal
	for (let i = 0; i < Filters.length; i++) {
		const el = document.createElement("tr");
		el.className = "inputForCat";
		el.innerHTML = `
		<td class="text">${Filters[i]}</td>
		<td><input class="filterClass" type="text" name="${Filters[i]}"></input></td>
		`;
		DialogueFilterWrapper?.appendChild(el);
	}

	//adds the sections to the section dropdown selector
	for (let i = 0; i < Sections.length; i++) {
		const el = document.createElement("option");

		el.value = Sections[i];
		el.innerHTML = Sections[i];
		SectionsWrapper?.appendChild(el);
	}

	for (let i = 0; i < Sections.length; i++) {
		const el = document.createElement("div");
		el.innerHTML = `
			<input type="checkbox" name="${Sections[i]}" id="${Sections[i]}">
			<label for="${Sections[i]}">${Sections[i]}</label><br>
		`;

		sectionCheckBox?.appendChild(el);
	}

	function getAllSearchParams(): [string, string, filterType] {
		return [SearchBox.value, SectionsWrapper.value, makeFiltersMap(DialogueFilterWrapper)];
	}

	SearchBox?.addEventListener("keydown", (keypress) => {
		if (keypress.key == "Enter") {
			search(...getAllSearchParams());
		}
	});

	SearchButton.onclick = function () {
		search(...getAllSearchParams());
	};
}

function isSmall(name: string): string {
	const smallRows = ["betű", "látva"];
	if (smallRows.includes(name)) {
		return "small";
	}
	return "";
}

function makeRowElement(rowidx: string, rowdata: Map<string, string>, keys: string[]): HTMLElement {
	const row = document.createElement("tr");
	row.id = rowidx;

	//i have to do this since for some reason js just decides to convert a map to an object
	const mapRowidx = new Map(Object.entries(rowdata));

	let elelment = new Row(mapRowidx);

	const defineRowIdx = document.createElement("td");
	defineRowIdx.className = "small rowIdx";
	defineRowIdx.innerHTML = `<input type="text" value="${rowidx}" name="${rowidx}" disabled>`;
	row.appendChild(defineRowIdx);

	for (let i = 0; i < keys.length; i++) {
		const td = document.createElement("td");
		const v = mapRowidx.get(keys[i]) == undefined ? "" : mapRowidx.get(keys[i]);
		td.className = isSmall(keys[i]);
		td.innerHTML = `<input type="text" value="${v}" name="${keys[i]}">`;
		row.appendChild(td);
	}

	return row;
}

async function search(searchString: string, searchSection: string, filters: filterType): Promise<rowDataType> {
	try {
		const resp = await fetch("http://localhost:8080/search/", {
			method: "POST",
			body: JSON.stringify({
				search: searchString,
				section: searchSection,
				filters: JSON.stringify(Object.fromEntries(filters)),
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			},
		});

		const responseText = await resp.text();

		const json = JSON.parse(responseText);

		const rowData = new Map(Object.entries(json["Data"])) as rowDataType;
		Keys = json["Keyset"];
		drawTitleRow();

		CurrentPage = 0;
		PageData = makePages(rowData);
		switchPage(0);

		return rowData;
	} catch (err) {
		console.log(err);
		return new Map();
	}
}

function makeFiltersMap(Filters: HTMLElement): filterType {
	let idx: filterType = new Map();
	const filterElements = Filters.children;

	for (let i = 0; i < filterElements.length; i++) {
		const key = filterElements[i].querySelector(".text")?.innerHTML as string;
		const valueEl = filterElements[i].querySelector(".filterClass") as HTMLInputElement;
		const value = valueEl.value;
		idx.set(key, value);
	}
	return idx;
}

function drawTitleRow() {
	TitleWrapper.innerHTML = `
	<!-- <th scope="col">munkafüzet</th> -->
	<th scope="col">oszlop, sor</th>
	`;
	Keys.forEach((key: string) => {
		const el = document.createElement("th");
		el.innerHTML = key;
		el.setAttribute("scope", "col");
		TitleWrapper?.appendChild(el);
	});
}

function drawDataInTable(data: rowDataType[], keys: string[]) {
	DataWrapper.innerHTML = ``;
	for (let row = 0; row < data.length; row++) {
		if (data[row] == undefined) continue;
		const rowIdx = data[row].keys().next().value as string;

		const el = makeRowElement(rowIdx, data[row].get(rowIdx) as Map<string, string>, keys) as HTMLElement;
		DataWrapper.appendChild(el);
	}
}

function getSortedElementsList(elements: rowDataType): string[] {
	let returnArray: string[] = [];
	let idxArray: number[][] = [];
	let columns: number[] = [];

	for (const [key, _] of elements.entries()) {
		const idx = key.split(", ");
		columns.push(parseInt(idx[0]));
	}
	for (let i = 0; i < Math.max(...columns); i++) {
		idxArray.push([]);
	}

	for (const [key, _] of elements.entries()) {
		const idx = key.split(", ");
		idxArray[parseInt(idx[0]) - 1].push(parseInt(idx[1]));
	}

	for (let i = 0; i < idxArray.length; i++) {
		idxArray[i].sort((a, b) => a - b);
	}

	for (let i = 0; i < idxArray.length; i++) {
		if (idxArray[i].length == 0) {
			continue;
		}
		for (let l = 0; l < idxArray[i].length; l++) {
			returnArray.push(`${i + 1}, ${idxArray[i][l]}`);
		}
	}
	return returnArray;
}

function makePages(data: rowDataType): rowDataType[][] {
	let returnData: rowDataType[][] = [];
	const sortedElementList = getSortedElementsList(data);
	MaxPages = Math.ceil(sortedElementList.length / MaxRowPerPage);
	for (let i = 0; i < MaxPages; i++) {
		returnData.push([]);
		for (let l = 0; l < MaxRowPerPage; l++) {
			const elIdx = sortedElementList[i * MaxRowPerPage + l];
			if (elIdx == undefined) {
				continue;
			}
			let idxMap = new Map();
			idxMap.set(elIdx, data.get(elIdx));
			returnData[i].push(idxMap);
		}
	}
	return returnData;
}
