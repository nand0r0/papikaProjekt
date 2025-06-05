package main

import (
	"fmt"
	"slices"
	"strings"
)

func getDataFromSection(section string, sectionMap map[string][][]string, keys []string, search string, filters map[string]string) mainDataType {

	output := make(mainDataType)

	for rowidx, row := range sectionMap[section]{
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
					output[fmt.Sprintf("%v, %v", colCount+1, rowidx+2)] = rowData
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
	return output
}

func isFilterInData(filter map[string]string, data map[string]string, search string) bool {
	val := false
	for _, value := range data {
		if strings.Contains(strings.ToLower(value), strings.ToLower(search)) {
			val = true
			for Filterkey := range filter {
				if !(strings.Contains(strings.ToLower(data[Filterkey]), strings.ToLower(filter[Filterkey]))) {
					val = false
				}
			}
		}
	}
	return val
}


func combineKeysets(selectedSections []string, keymap map[string][]string) []string {
	var combinedKeyset []string
	for _, v := range selectedSections {
		for _, key := range keymap[v] {
			if !slices.Contains(combinedKeyset, key) {combinedKeyset = append(combinedKeyset, key)}
		}
	}
	return combinedKeyset
}

func combineAllKeysets(keymap map[string][]string) []string {
	var combinedKeyset []string
	for _, v := range keymap {
		for _, key := range v {
			if !slices.Contains(combinedKeyset, key) {combinedKeyset = append(combinedKeyset, key)}
		}
	}
	fmt.Println(combinedKeyset)
	return combinedKeyset
}
