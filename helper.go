package main

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

func getKeys(Mainrows row) []string {
	var keys []string
	main:
	for rowidx, row := range Mainrows {
		for _, colCell := range row {
			if rowidx == 0 {
				if colCell == "határ" {
					break main
				}
				keys = append(keys, colCell)
			} else {
				break main
			}
		}
	}
	return keys
}

func convertListToString(inpt []string) string {
	var idxString string

	for elidx, el := range inpt {
		if elidx == len(inpt) - 1 {
			idxString += el
			break
		}
		idxString += fmt.Sprintf("%s; ", el)
	}
	return idxString
}

func getSection(file *excelize.File, section string, keys []string) mainDataType {

	output := make(mainDataType)

	rows, err := file.GetRows(section)
	if err != nil {
		fmt.Println(err)
		panic(err)
	}

	for rowidx, row := range rows {
		if rowidx == 0 {continue}
		// if rowidx > 20 {break}
		isEmpty := true
		placeholder := make(map[string]string) 
		for colidx, colCell := range row {
			if colidx >= len(keys) {break}
			placeholder[keys[colidx]] = colCell
			
			if colCell != "" {isEmpty = false}
		}
		if isEmpty {continue}
		output[strconv.Itoa(rowidx - 1)] = placeholder  
	}	

	return output
}

func isFilterInData(filter map[string]string, data map[string]string) bool {
	for key := range filter {
		if !(strings.Contains(strings.ToLower(data[key]), strings.ToLower(filter[key]))) {return false}
	}
	return true
}