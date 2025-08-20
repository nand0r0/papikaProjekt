//main Typescript file
type propertyFilterType = Map<string, string>;

//["col, row"][key, value]
type rowDataType = Map<string, Map<string, string>>;

const TitleWrapper = document.getElementById("titles") as HTMLElement;
const DataWrapper = document.getElementById("dataWrapper") as HTMLElement;
const DialogueFilterWrapper = document.getElementById("listWrapper") as HTMLElement;
const SheetsWrapper = document.getElementById("sections") as HTMLSelectElement;
const SearchBox = document.getElementById("searchBox") as HTMLInputElement;
const SearchButton = document.getElementById("searchButton") as HTMLButtonElement;
const PageCounter = document.getElementById("pageCounter") as HTMLElement;
const SheetCheckBox = document.getElementById("sectionCheckBox") as HTMLElement;
const Savebutton = document.getElementById("save") as HTMLButtonElement;

//150
const _MAXROWPERPAGE = 80;
let _CurrentPage = 0;

let _SheetNames: string[];
let _Keys: string[];
let _LoadedRows = new Map<string, Row[]>();
let _CachedRows = new Map<string, Row[]>();
let _LoadedPages: Row[][];

let _IsRendering = false;

let MaxPages = 0;

fetch("http://localhost:8080/base/")
	.then((resp) => resp.json())
	.then((json) => main(json));

function main(json: string[][]) {
	const Filters: string[] = json[0];
	_SheetNames = json[1];

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
	for (let i = 0; i < _SheetNames.length; i++) {
		const el = document.createElement("div");
		el.innerHTML = `
			<input type="checkbox" name="${_SheetNames[i]}" id="${_SheetNames[i]}">
			<label for="${_SheetNames[i]}">${_SheetNames[i]}</label><br>
		`;

		SheetCheckBox?.appendChild(el);
	}

	function getAllSearchParams(): [string, { [index: string]: boolean }, propertyFilterType, { decimalPoint: number; latitude: number; longitude: number }] {
		let checkedSheets: { [index: string]: boolean } = {};

		for (let i of SheetCheckBox.children) {
			let checkbox = i.children[0] as HTMLInputElement;
			checkedSheets[checkbox.id] = checkbox.checked;
		}

		const decimalPointCoordInputElement = document.getElementById("decimalPoint") as HTMLInputElement;
		const latitudeInputElement = document.getElementById("latitude") as HTMLInputElement;
		const longitudeInputElement = document.getElementById("longitude") as HTMLInputElement;
		const decimalPoint = parseInt(decimalPointCoordInputElement.value);
		const latitude = parseFloat(latitudeInputElement.value);
		const longitude = parseFloat(longitudeInputElement.value);

		return [SearchBox.value, checkedSheets, makeFiltersMap(DialogueFilterWrapper), { decimalPoint, latitude, longitude }];
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

async function search(
	searchString: string,
	tickedSheets: { [index: string]: boolean },
	propertyFilters: propertyFilterType,
	coordinateFilter: { decimalPoint: number; latitude: number; longitude: number }
) {
	try {
		const resp = await fetch("http://localhost:8080/search/", {
			method: "POST",
			body: JSON.stringify({
				search: searchString,
				checkedSheets: JSON.stringify(tickedSheets),
				propertyFilters: JSON.stringify(Object.fromEntries(propertyFilters)),
				coordinateFilter: JSON.stringify(coordinateFilter),
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			},
		});

		_LoadedRows = new Map();

		const responseText = await resp.text();

		const json = JSON.parse(responseText);

		_Keys = json["Keyset"];

		for (let [sheetName, sheetData] of Object.entries(json["Data"])) {
			if (sheetData == null || Object.keys(sheetData).length == 0) {
				continue;
			}

			loadRowsAsObjectsInSheet(sheetName, new Map(Object.entries(sheetData)));
		}

		_LoadedPages = makePages(_LoadedRows);

		renderHeaderRow();

		_CurrentPage = 0;
		switchPage(0);
	} catch (err) {
		console.log(err);
		return new Map();
	}
}

function loadRowsAsObjectsInSheet(sheetName: string, sheetData: rowDataType) {
	sheetData.forEach((rowData, rowPosition) => {
		let cachingRowArray = _CachedRows.get(sheetName);
		let loadedRowArray = _LoadedRows.get(sheetName);

		const rowObject = new Row(rowData, rowPosition, sheetName);
		const cachedRowObjectTwin = cachingRowArray?.find((obj) => obj.position == rowPosition);

		if (loadedRowArray == undefined) {
			_LoadedRows.set(sheetName, [rowObject]);
		} else if (cachedRowObjectTwin != undefined) {
			loadedRowArray.push(cachedRowObjectTwin);
		} else {
			loadedRowArray.push(rowObject);
		}
	});
}

function makeFiltersMap(propertyFilters: HTMLElement): propertyFilterType {
	let idx: propertyFilterType = new Map();
	const filterElements = propertyFilters.children;

	for (let i = 0; i < filterElements.length; i++) {
		const key = filterElements[i].querySelector(".text")?.innerHTML as string;
		const valueEl = filterElements[i].querySelector(".filterClass") as HTMLInputElement;
		const value = valueEl.value;
		idx.set(key, value);
	}
	return idx;
}

function renderHeaderRow() {
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

async function renderRowsInTable(rows: Row[], keys: string[]) {
	if (rows == undefined) {
		return;
	}

	if (_IsRendering) {
		while (_IsRendering) {
			await delay(50);
		}
	}

	_IsRendering = true;
	DataWrapper.innerHTML = ``;

	rows.forEach((rowElement) => {
		setTimeout(function () {
			DataWrapper.appendChild(rowElement.getHTMLRowElement(keys));
		}, 5);
	});
	setTimeout(function () {
		_IsRendering = false;
	}, 100);
}

function getSortedRowObjects(elements: Row[]): Row[] {
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
		sortedElementList.push(...getSortedRowObjects(sectionData));
	});

	MaxPages = Math.ceil(sortedElementList.length / _MAXROWPERPAGE);

	for (let page = 0; page < MaxPages; page++) {
		returnData.push([]);
		for (let rowIdx = 0; rowIdx < _MAXROWPERPAGE; rowIdx++) {
			const element = sortedElementList[page * _MAXROWPERPAGE + rowIdx];
			if (element == undefined) {
				continue;
			}
			returnData[page].push(element);
		}
	}

	return returnData;
}

function switchPage(page: number) {
	renderRowsInTable(_LoadedPages[page], _Keys);
	prevPage(true);
	nextPage(true);
	PageCounter.innerHTML = `${page + 1}/${MaxPages}📃`;
}

function cacheRow(sheetAndPostion: string, key: string, value: string) {
	const sheetName = sheetAndPostion.split("; ")[0];
	const position = sheetAndPostion.split("; ")[1];
	const rowForCaching: Row = getRowObjectFromPositionInSheet(sheetName, position);
	const sheetToCacheTo = _CachedRows.get(sheetName) as Row[];

	rowForCaching.setData(key, value);

	let cachingRowArray = _CachedRows.get(sheetName);

	if (cachingRowArray == undefined) {
		_CachedRows.set(sheetName, [rowForCaching]);
	} else if (sheetToCacheTo.includes(rowForCaching)) {
		sheetToCacheTo[sheetToCacheTo.indexOf(rowForCaching)] = rowForCaching;
	} else {
		cachingRowArray?.push(getRowObjectFromPositionInSheet(sheetName, position));
	}
}

function getRowObjectFromPositionInSheet(sheet: string, position: string): Row {
	let rowObject: Row = new Row(new Map<string, string>(), "", "");
	_LoadedRows.forEach((s) => {
		s.forEach((rowobj) => {
			if (rowobj.sheet == sheet && rowobj.position == position) {
				rowObject = rowobj;
				return;
			}
		});
	});
	return rowObject;
}

interface exportableRowDataType {
	[colrow: string]: { [key: string]: string };
}

function convertDataIntoExportableObject(data: Map<string, Row[]>): { [section: string]: exportableRowDataType } {
	let returnData: { [section: string]: exportableRowDataType } = {};
	data.forEach((objects, section) => {
		let IdxMap: exportableRowDataType = {};
		objects.forEach((rowObject) => {
			IdxMap[rowObject.position] = rowObject.getRowDataAsObject();
		});
		returnData[section] = IdxMap;
	});
	return returnData;
}

function resetPage() {
	_SheetNames = [];
	_Keys = [];
	_LoadedRows = new Map<string, Row[]>();
	_CachedRows = new Map<string, Row[]>();
	_LoadedPages = [];
	DataWrapper.innerHTML = "";
}

async function save() {
	blurDocument(true);
	const resp = await fetch("http://localhost:8080/save/", {
		method: "POST",
		body: JSON.stringify({ saveData: convertDataIntoExportableObject(_CachedRows) }),
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		},
	});

	const responseText = await resp.text();

	console.log(responseText);

	blurDocument(false);
}

async function saveAs() {
	const resp = await fetch("http://localhost:8080/saveAs/", {
		method: "POST",
		body: JSON.stringify({
			saveData: convertDataIntoExportableObject(_LoadedRows),
			keys: _Keys,
			// fileName:
		}),
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		},
	});
}
