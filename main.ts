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
let _CurrentPage = 0;

let _Sections: string[];
let _Keys: string[];
let _LoadedRows = new Map<string, Row[]>();
let _SavedRows = new Map<string, Row[]>();
let _LoadedPages: Row[][];

fetch("http://localhost:8080/base/")
	.then((resp) => resp.json())
	.then((json) => main(json));

function main(json: string[][]) {
	const Filters: string[] = json[0];
	_Sections = json[1];

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
	for (let i = 0; i < _Sections.length; i++) {
		const el = document.createElement("div");
		el.innerHTML = `
			<input type="checkbox" name="${_Sections[i]}" id="${_Sections[i]}">
			<label for="${_Sections[i]}">${_Sections[i]}</label><br>
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

		_LoadedRows = new Map<string, Row[]>();

		const responseText = await resp.text();

		const json = JSON.parse(responseText);

		const ImportedData = new Map(Object.entries(json["Data"])) as rowDataType;

		_Keys = json["Keyset"];

		for (let [section, sectionData] of Object.entries(json["Data"])) {
			if (sectionData == null || Object.keys(sectionData).length == 0) {
				continue;
			}

			loadRowsAsObjects(section, new Map(Object.entries(sectionData)));
		}

		_LoadedPages = makePages(_LoadedRows);

		console.log(_LoadedPages);

		drawTitleRow();

		_CurrentPage = 0;
		switchPage(0);

		return ImportedData;
	} catch (err) {
		console.log(err);
		return new Map();
	}
}

function loadRowsAsObjects(SECTION: string, SECTIONDATA: rowDataType) {
	SECTIONDATA.forEach((rowData, rowPosition) => {
		let rowArray = _LoadedRows.get(SECTION);
		if (rowArray == undefined) {
			_LoadedRows.set(SECTION, []);
			rowArray = _LoadedRows.get(SECTION);
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
	_Keys.forEach((key: string) => {
		const el = document.createElement("th");
		el.innerHTML = key;
		el.setAttribute("scope", "col");
		TitleWrapper?.appendChild(el);
	});
}

function drawDataInTable(data: Row[], keys: string[]) {
	DataWrapper.innerHTML = ``;
	data.forEach((rowElement) => {
		DataWrapper.appendChild(rowElement.getHTMLRowElement(keys));
	});
}

function getSortedRowElements(elements: Row[]): Row[] {
	let returnArray: Row[] = [];
	let idxArray: number[][] = [];
	let columns: number[] = [];

	for (const row of elements) {
		const idx = row.position.split(", ");
		columns.push(parseInt(idx[0]));
	}
	for (let i = 0; i < Math.max(...columns); i++) {
		idxArray.push([]);
	}

	for (const row of elements) {
		const idx = row.position.split(", ");
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
			// i + 1 = col
			// idxArray[i][l] = row
			for (let row of elements) {
				const posAsString = `${i + 1}, ${idxArray[i][l]}`;

				if (row.position == posAsString) {
					returnArray.push(row);
					break;
				}
			}
		}
	}
	return returnArray;
}

function makePages(data: Map<string, Row[]>): Row[][] {
	let returnData: Row[][] = [];

	let sortedElementList: Row[] = [];

	data.forEach((sectionData) => {
		sortedElementList.push(...getSortedRowElements(sectionData));
	});

	MaxPages = Math.ceil(sortedElementList.length / MaxRowPerPage);

	for (let page = 0; page < MaxPages; page++) {
		returnData.push([]);
		for (let rowIdx = 0; rowIdx < MaxRowPerPage; rowIdx++) {
			const element = sortedElementList[page * MaxRowPerPage + rowIdx];
			if (element == undefined) {
				continue;
			}
			returnData[page].push(element);
		}
	}

	return returnData;
}

function switchPage(page: number) {
	drawDataInTable(_LoadedPages[page], _Keys);
	prevPage(true);
	nextPage(true);
	PageCounter.innerHTML = `${page + 1}/${MaxPages}`;
}
