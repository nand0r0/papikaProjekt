package main

import (
	"fmt"
	"os"
	"slices"
	"strings"
	"sync"

	"github.com/xuri/excelize/v2"
)

func getFilteredDataFromSheet(sheetName string, sheetMap map[string][][]string, keys []string, search string, filters map[string]string) (sheetData mainDataType) {

	sheetData = make(mainDataType)

	for rowidx, row := range sheetMap[sheetName]{
		if rowidx == 0 {
			continue
		}
		colCount := 0
		rowData := make(map[string]string)
		isEmpty := true
		for colidx, colCell := range row {

			if colCell != "" && colCell != "x" {
				isEmpty = false
			}

			idx := colidx % (len(keys) + 3)

			if idx == len(keys) {
				if isEmpty {
					continue
				}
				if isFilterInData(filters, rowData, search) {
					sheetData[fmt.Sprintf("%v, %v", colCount+1, rowidx+1)] = rowData
				}
				colCount++
				rowData = make(map[string]string)
				isEmpty = true
				continue
			}

			if idx >= len(keys) {
				idx = 0
			}

			rowData[keys[idx]] = colCell

		}
	}
	return sheetData
}

func isFilterInData(filter map[string]string, data map[string]string, search string) (returnValue bool) {
	returnValue = false
	for _, value := range data {
		if strings.Contains(strings.ToLower(value), strings.ToLower(search)) {
			returnValue = true
			for Filterkey := range filter {
				if !(strings.Contains(strings.ToLower(data[Filterkey]), strings.ToLower(filter[Filterkey]))) {
					returnValue = false
				}
			}
		}
	}
	return returnValue
}

func combineKeysets(selectedSections []string, keymap map[string][]string) (combinedKeyset []string) {
	for _, v := range selectedSections {
		for _, key := range keymap[v] {
			if !slices.Contains(combinedKeyset, key) {combinedKeyset = append(combinedKeyset, key)}
		}
	}
	return combinedKeyset
}

func combineAllKeysets(keymap map[string][]string) (combinedKeyset []string) {
	for _, v := range keymap {
		for _, key := range v {
			if !slices.Contains(combinedKeyset, key) {combinedKeyset = append(combinedKeyset, key)}
		}
	}
	return combinedKeyset
}

func getFileData(filePath string, sheetNames []string) (sheetsDataMap map[string][][]string, keyMap map[string][]string, file *excelize.File) {
	fmt.Println("Betöltés...")
	sheetsDataMap = make(map[string][][]string)
	keyMap = make(map[string][]string)
	file, err := excelize.OpenFile(filePath)
	if err != nil {
		fmt.Printf("%v Press enter to exit.", err)
		fmt.Scanln()
		os.Exit(1)
	}
	var wg sync.WaitGroup

	for _, sectionName := range sheetNames {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rows, err := file.GetRows(sectionName)
			if err != nil {
				fmt.Println(err)
				return
			}
			sheetsDataMap[sectionName] = rows

			for i, row := range rows {	
				if i > 0 {break}
				
				for _, el := range row {
					if el == "határ" {break}
					keyMap[sectionName] = append(keyMap[sectionName], el)
				}
			}
		}()
	}
	wg.Wait()	
	fmt.Println("Kész!")
	return sheetsDataMap, keyMap, file
}