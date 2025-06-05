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
const SectionCheckBox = document.getElementById("sectionCheckBox") as HTMLElement;

const MaxRowPerPage = 150;
let MaxPages = 0;
let CurrentPage = 0;

let Keys: string[] = [];
let LoadedRows = new Map<string, Row[]>();
let SavedRows = new Map<string, Row[]>();

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

	//adds the sections as checkboxes into the modal
	for (let i = 0; i < Sections.length; i++) {
		const el = document.createElement("div");
		el.innerHTML = `
			<input type="checkbox" name="${Sections[i]}" id="${Sections[i]}">
			<label for="${Sections[i]}">${Sections[i]}</label><br>
		`;

		SectionCheckBox?.appendChild(el);
	}

	function getAllSearchParams(): [string, { [index: string]: boolean }, filterType] {
		let checkedSections: { [index: string]: boolean } = {};

		for (let i of SectionCheckBox.children) {
			let checkbox = i.children[0] as HTMLInputElement;
			checkedSections[checkbox.id] = checkbox.checked;
		}
		return [SearchBox.value, checkedSections, makeFiltersMap(DialogueFilterWrapper)];
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

async function search(searchString: string, tickedSections: { [index: string]: boolean }, filters: filterType): Promise<rowDataType> {
	try {
		const resp = await fetch("http://localhost:8080/search/", {
			method: "POST",
			body: JSON.stringify({
				search: searchString,
				checkedSections: JSON.stringify(tickedSections),
				filters: JSON.stringify(Object.fromEntries(filters)),
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			},
		});

		LoadedRows = new Map<string, Row[]>();

		const responseText = await resp.text();

		const json = JSON.parse(responseText);

		const ImportedData = new Map(Object.entries(json["Data"])) as rowDataType;

		Keys = json["Keyset"];

		for (let [section, sectionData] of Object.entries(json["Data"])) {
			if (sectionData == null || Object.keys(sectionData).length == 0) {
				continue;
			}

			loadRowsAsObjects(section, new Map(Object.entries(sectionData)));
		}

		console.log(LoadedRows);

		drawTitleRow();

		CurrentPage = 0;
		switchPage(0);

		return ImportedData;
	} catch (err) {
		console.log(err);
		return new Map();
	}
}

function loadRowsAsObjects(SECTION: string, SECTIONDATA: rowDataType) {
	SECTIONDATA.forEach((rowData, rowPosition) => {
		let rowArray = LoadedRows.get(SECTION);
		if (rowArray == undefined) {
			LoadedRows.set(SECTION, []);
			rowArray = LoadedRows.get(SECTION);
			rowArray?.push(new Row(rowData, rowPosition, SECTION));
		} else {
			rowArray?.push(new Row(rowData, rowPosition, SECTION));
		}
	});
}

function makeFiltersMap(FILTERS: HTMLElement): filterType {
	let idx: filterType = new Map();
	const filterElements = FILTERS.children;

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
	<th scope="col">munkafüzet</th>
	<th scope="col">oszlop, sor</th>
	`;
	Keys.forEach((key: string) => {
		const el = document.createElement("th");
		el.innerHTML = key;
		el.setAttribute("scope", "col");
		TitleWrapper?.appendChild(el);
	});
}

function drawDataInTable(data: Map<string, Row[]>, keys: string[]) {
	DataWrapper.innerHTML = ``;
	data.forEach((rowArray: Row[]) => {
		rowArray.forEach((rowElement) => {
			DataWrapper.appendChild(rowElement.getHTMLRowElement(keys));
		});
	});
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

function switchPage(page: number) {
	drawDataInTable(LoadedRows, Keys);
	prevPage(true);
	nextPage(true);
	PageCounter.innerHTML = `${page + 1}/${MaxPages}`;
}
