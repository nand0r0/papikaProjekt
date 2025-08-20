package main

import (
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"

	"github.com/xuri/excelize/v2"
)

func getFilteredDataFromSheet(sheetName string, sheetMap map[string][][]string, keys []string, search string, propertyFilters map[string]string, coordinateFilter coordinateFilterType) (sheetData mainDataType) {

	passesFilter := func(rowData map[string]string) (returnValue bool)  {
		returnValue = false
		for _, value := range rowData {
			if strings.Contains(strings.ToLower(value), strings.ToLower(search)) {
				returnValue = true
				for Filterkey := range propertyFilters {
					if !(strings.Contains(strings.ToLower(rowData[Filterkey]), strings.ToLower(propertyFilters[Filterkey]))) {
						returnValue = false
					}
				}
			}
		}	


		rawCoordinateString := rowData["koord"]
		
		
		if coordinateFilter.latitude == 0 && coordinateFilter.longitude == 0 {
			return returnValue
		}

		latitude, longitude := convertRawCoordinatesToFloat(rawCoordinateString)

		if latitude == 0 || longitude == 0 {
			return false
		}
		
		latitudeFilterString := removeDecimalPointToString(float64(coordinateFilter.latitude))
		longitudeFitlerString := removeDecimalPointToString(float64(coordinateFilter.longitude))
		rowLatitudeString := removeDecimalPointToString(latitude)
		rowLongitudeString := removeDecimalPointToString(longitude)

		fmt.Println(rowLatitudeString, latitudeFilterString)

		if coordinateFilter.latitude != 0 {
			if compareStrippedCoordinates(latitudeFilterString, rowLatitudeString, int(coordinateFilter.decimalPoint)) {
				returnValue = true
			} else {
				return false
			}
		}

		if coordinateFilter.longitude != 0 {
			if compareStrippedCoordinates(longitudeFitlerString, rowLongitudeString, int(coordinateFilter.decimalPoint)) {
				returnValue = true
			} else {
				return false
			}
		}

		
		return returnValue
	}

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
				if passesFilter(rowData) {
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


func combineSeletctedKeysets(selectedSheets []string, keymap map[string][]string) (combinedKeyset []string) {
	for _, v := range selectedSheets {
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

func convertCoordinateFilterToStruct(filterParameters map[string]float32) (result coordinateFilterType) {
	result.decimalPoint = int(filterParameters["decimalPoint"])
	result.latitude = filterParameters["latitude"]
	result.longitude = filterParameters["longitude"]

	return result
}

func convertRawCoordinatesToFloat(rawCoordinateString string) (latitude float64, longitude float64) {
	if len(rawCoordinateString) == 0  {
		return 0, 0
	}

	//first character check
	_, err := strconv.ParseInt(string(rawCoordinateString[0]), 10, 64)

	if err != nil {
		if string(rawCoordinateString[0]) == " "  {
			goto firstCharIsBlank
		} else {
			return 0, 0
		}
	}

	
	firstCharIsBlank:
	
	latitudeString := ""
	longitudeString := ""

	pastLatitude := false
	pastEmptySpace := false

	for _, charRune := range rawCoordinateString {
		currentCharacter := string(charRune)
		if !pastLatitude {
			if currentCharacter == " " && !pastEmptySpace {
				continue
			} else {
				pastEmptySpace = true
				_, err := strconv.ParseInt(currentCharacter, 10, 64)
				if err != nil {
					if currentCharacter == "." {
						latitudeString = strings.Join( []string{latitudeString,  currentCharacter}  , "")
						continue
					} else {
						pastLatitude = true
						continue
					}
				}
				latitudeString = strings.Join([]string{latitudeString,  currentCharacter}  , "")
			}

		} else {
			_, err := strconv.ParseInt(currentCharacter, 10, 64)
			if err != nil {
				if currentCharacter == "." {
					longitudeString = strings.Join([]string{longitudeString,  currentCharacter}  , "")
					continue
				} else {
					continue
				}
			}
			longitudeString = strings.Join([]string{longitudeString,  currentCharacter}  , "")
		}
	}
	
	latitude, _ = strconv.ParseFloat(latitudeString, 64)
	longitude, _ = strconv.ParseFloat(longitudeString, 64)
	return latitude, longitude
}

// 32.12345 -> "3212345"
func removeDecimalPointToString(input float64) (output string) {
	if input == 0 {
		return "00000000"
	}
	inputString := strconv.FormatFloat(input, 'f', -1, 64)
	output = strings.ReplaceAll(string(inputString), ".", "")
	return output
}

func compareStrippedCoordinates(x1 string, x2 string, decimalPoint int) bool {
	if len(x1) < decimalPoint || len(x2) < decimalPoint {return false} 
	return x1[0:decimalPoint] == x2[0:decimalPoint]
}