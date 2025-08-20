"use strict";
const TitleWrapper = document.getElementById("titles");
const DataWrapper = document.getElementById("dataWrapper");
const DialogueFilterWrapper = document.getElementById("listWrapper");
const SheetsWrapper = document.getElementById("sections");
const SearchBox = document.getElementById("searchBox");
const SearchButton = document.getElementById("searchButton");
const PageCounter = document.getElementById("pageCounter");
const SheetCheckBox = document.getElementById("sectionCheckBox");
const Savebutton = document.getElementById("save");
const _MAXROWPERPAGE = 80;
let _CurrentPage = 0;
let _SheetNames;
let _Keys;
let _LoadedRows = new Map();
let _CachedRows = new Map();
let _LoadedPages;
let _IsRendering = false;
let MaxPages = 0;
fetch("http://localhost:8080/base/")
    .then((resp) => resp.json())
    .then((json) => main(json));
function main(json) {
    const Filters = json[0];
    _SheetNames = json[1];
    for (let i = 0; i < Filters.length; i++) {
        const el = document.createElement("tr");
        el.className = "inputForCat";
        el.innerHTML = `
		<td class="text">${Filters[i]}</td>
		<td><input class="filterClass" type="text" name="${Filters[i]}"></input></td>
		`;
        DialogueFilterWrapper?.appendChild(el);
    }
    for (let i = 0; i < _SheetNames.length; i++) {
        const el = document.createElement("div");
        el.innerHTML = `
			<input type="checkbox" name="${_SheetNames[i]}" id="${_SheetNames[i]}">
			<label for="${_SheetNames[i]}">${_SheetNames[i]}</label><br>
		`;
        SheetCheckBox?.appendChild(el);
    }
    function getAllSearchParams() {
        let checkedSheets = {};
        for (let i of SheetCheckBox.children) {
            let checkbox = i.children[0];
            checkedSheets[checkbox.id] = checkbox.checked;
        }
        const decimalPointCoordInputElement = document.getElementById("decimalPoint");
        const latitudeInputElement = document.getElementById("latitude");
        const longitudeInputElement = document.getElementById("longitude");
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
function isSmall(name) {
    const smallRows = ["betű", "látva"];
    if (smallRows.includes(name)) {
        return "small";
    }
    return "";
}
async function search(searchString, tickedSheets, propertyFilters, coordinateFilter) {
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
    }
    catch (err) {
        console.log(err);
        return new Map();
    }
}
function loadRowsAsObjectsInSheet(sheetName, sheetData) {
    sheetData.forEach((rowData, rowPosition) => {
        let cachingRowArray = _CachedRows.get(sheetName);
        let loadedRowArray = _LoadedRows.get(sheetName);
        const rowObject = new Row(rowData, rowPosition, sheetName);
        const cachedRowObjectTwin = cachingRowArray?.find((obj) => obj.position == rowPosition);
        if (loadedRowArray == undefined) {
            _LoadedRows.set(sheetName, [rowObject]);
        }
        else if (cachedRowObjectTwin != undefined) {
            loadedRowArray.push(cachedRowObjectTwin);
        }
        else {
            loadedRowArray.push(rowObject);
        }
    });
}
function makeFiltersMap(propertyFilters) {
    let idx = new Map();
    const filterElements = propertyFilters.children;
    for (let i = 0; i < filterElements.length; i++) {
        const key = filterElements[i].querySelector(".text")?.innerHTML;
        const valueEl = filterElements[i].querySelector(".filterClass");
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
    _Keys.forEach((key) => {
        const el = document.createElement("th");
        el.innerHTML = key;
        el.setAttribute("scope", "col");
        TitleWrapper?.appendChild(el);
    });
}
async function renderRowsInTable(rows, keys) {
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
function getSortedRowObjects(elements) {
    let returnArray = [];
    let idxArray = [];
    let columns = [];
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
function makePages(data) {
    let returnData = [];
    let sortedElementList = [];
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
function switchPage(page) {
    renderRowsInTable(_LoadedPages[page], _Keys);
    prevPage(true);
    nextPage(true);
    PageCounter.innerHTML = `${page + 1}/${MaxPages}📃`;
}
function cacheRow(sheetAndPostion, key, value) {
    const sheetName = sheetAndPostion.split("; ")[0];
    const position = sheetAndPostion.split("; ")[1];
    const rowForCaching = getRowObjectFromPositionInSheet(sheetName, position);
    const sheetToCacheTo = _CachedRows.get(sheetName);
    rowForCaching.setData(key, value);
    let cachingRowArray = _CachedRows.get(sheetName);
    if (cachingRowArray == undefined) {
        _CachedRows.set(sheetName, [rowForCaching]);
    }
    else if (sheetToCacheTo.includes(rowForCaching)) {
        sheetToCacheTo[sheetToCacheTo.indexOf(rowForCaching)] = rowForCaching;
    }
    else {
        cachingRowArray?.push(getRowObjectFromPositionInSheet(sheetName, position));
    }
}
function getRowObjectFromPositionInSheet(sheet, position) {
    let rowObject = new Row(new Map(), "", "");
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
function convertDataIntoExportableObject(data) {
    let returnData = {};
    data.forEach((objects, section) => {
        let IdxMap = {};
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
    _LoadedRows = new Map();
    _CachedRows = new Map();
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
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
        },
    });
}
