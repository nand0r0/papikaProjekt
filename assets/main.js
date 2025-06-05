"use strict";
const TitleWrapper = document.getElementById("titles");
const DataWrapper = document.getElementById("dataWrapper");
const DialogueFilterWrapper = document.getElementById("listWrapper");
const SectionsWrapper = document.getElementById("sections");
const SearchBox = document.getElementById("searchBox");
const SearchButton = document.getElementById("searchButton");
const PageCounter = document.getElementById("pageCounter");
const SectionCheckBox = document.getElementById("sectionCheckBox");
const MaxRowPerPage = 150;
let MaxPages = 0;
let _CurrentPage = 0;
let _Sections;
let _Keys;
let _LoadedRows = new Map();
let _SavedRows = new Map();
let _LoadedPages;
fetch("http://localhost:8080/base/")
    .then((resp) => resp.json())
    .then((json) => main(json));
function main(json) {
    const Filters = json[0];
    _Sections = json[1];
    for (let i = 0; i < Filters.length; i++) {
        const el = document.createElement("tr");
        el.className = "inputForCat";
        el.innerHTML = `
		<td class="text">${Filters[i]}</td>
		<td><input class="filterClass" type="text" name="${Filters[i]}"></input></td>
		`;
        DialogueFilterWrapper?.appendChild(el);
    }
    for (let i = 0; i < _Sections.length; i++) {
        const el = document.createElement("div");
        el.innerHTML = `
			<input type="checkbox" name="${_Sections[i]}" id="${_Sections[i]}">
			<label for="${_Sections[i]}">${_Sections[i]}</label><br>
		`;
        SectionCheckBox?.appendChild(el);
    }
    function getAllSearchParams() {
        let checkedSections = {};
        for (let i of SectionCheckBox.children) {
            let checkbox = i.children[0];
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
function isSmall(name) {
    const smallRows = ["betű", "látva"];
    if (smallRows.includes(name)) {
        return "small";
    }
    return "";
}
async function search(searchString, tickedSections, filters) {
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
        _LoadedRows = new Map();
        const responseText = await resp.text();
        const json = JSON.parse(responseText);
        const ImportedData = new Map(Object.entries(json["Data"]));
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
    }
    catch (err) {
        console.log(err);
        return new Map();
    }
}
function loadRowsAsObjects(SECTION, SECTIONDATA) {
    SECTIONDATA.forEach((rowData, rowPosition) => {
        let rowArray = _LoadedRows.get(SECTION);
        if (rowArray == undefined) {
            _LoadedRows.set(SECTION, []);
            rowArray = _LoadedRows.get(SECTION);
            rowArray?.push(new Row(rowData, rowPosition, SECTION));
        }
        else {
            rowArray?.push(new Row(rowData, rowPosition, SECTION));
        }
    });
}
function makeFiltersMap(FILTERS) {
    let idx = new Map();
    const filterElements = FILTERS.children;
    for (let i = 0; i < filterElements.length; i++) {
        const key = filterElements[i].querySelector(".text")?.innerHTML;
        const valueEl = filterElements[i].querySelector(".filterClass");
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
    _Keys.forEach((key) => {
        const el = document.createElement("th");
        el.innerHTML = key;
        el.setAttribute("scope", "col");
        TitleWrapper?.appendChild(el);
    });
}
function drawDataInTable(data, keys) {
    DataWrapper.innerHTML = ``;
    data.forEach((rowElement) => {
        DataWrapper.appendChild(rowElement.getHTMLRowElement(keys));
    });
}
function getSortedRowElements(elements) {
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
function switchPage(page) {
    drawDataInTable(_LoadedPages[page], _Keys);
    prevPage(true);
    nextPage(true);
    PageCounter.innerHTML = `${page + 1}/${MaxPages}`;
}
