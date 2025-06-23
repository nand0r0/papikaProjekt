package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// ["col, row" -> [elementkey -> itemvalue]]
type mainDataType map[string]map[string]string

func main() {
	

	fs := http.FileServer(http.Dir("assets"))
	http.Handle("/assets/", http.StripPrefix("/assets", fs))

	SHEETNAMES := []string{"VKK", "templom", "látnivalók", "VKKBudapest", "MOn kívüli magyar", "elbontott"}

	_SheetsDataMap, _KeyMap, _CurrentFile := getFileData("assets/mainmain.xlsx", SHEETNAMES)


	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		
		tmpl := template.Must(template.ParseFiles("assets/index.html"))
		tmpl.Execute(w, "")
	})

	http.HandleFunc("/base/", func(w http.ResponseWriter, r *http.Request) {
		sendData, err := json.Marshal([][]string{combineAllKeysets(_KeyMap), SHEETNAMES})
		if err != nil {
			fmt.Println(err)
			return
		}
		w.Write(sendData)
	})

	http.HandleFunc("/save/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Mentés folyamatban...")
		inputBit, err := io.ReadAll(r.Body)
		if err != nil {
			fmt.Println(err)
			return
		}

		var Input map[string]map[string]mainDataType
		err = json.Unmarshal(inputBit, &Input)
		if err != nil {
			fmt.Println(err)
			return
		}
		
		for sheetName, sheetData := range Input["saveData"] {
			for rowPosition, rowData := range sheetData {				
				for keyIndex, key := range _KeyMap[sheetName] {
					sectionIndex, err := strconv.Atoi(strings.Split(rowPosition, ", ")[0])
					if err != nil {
						fmt.Println(err)
						return
					}
					row, err := strconv.Atoi(strings.Split(rowPosition, ", ")[1])
					if err != nil {
						fmt.Println(err)
						return
					}
					col := (sectionIndex - 1) * (len(_KeyMap[sheetName]) + 3) + keyIndex
					
					selectedCell, err := excelize.CoordinatesToCellName(col + 1, row)
					fmt.Println(selectedCell)
					if err != nil {
						fmt.Println(err)
						return
					}
					err = _CurrentFile.SetCellStr(sheetName, selectedCell, rowData[key])
					if err != nil {
						fmt.Println(err)
						return
					}					
				}
			}
		}
		output, err := json.Marshal("done")
		if err != nil {
			fmt.Println(err)
			return
		}
		saveError := _CurrentFile.Save()
		if saveError != nil {
			output, err = json.Marshal(saveError)
			w.Write(output)
			if err != nil {
				fmt.Println(err)
				return
			}
			fmt.Println(err)
			return
		}
		w.Write(output)
		fmt.Println("Mentés kész!")

	})

	http.HandleFunc("/saveAs/", func(w http.ResponseWriter, r *http.Request) {

	})

	http.HandleFunc("/reloadFile/", func(w http.ResponseWriter, r *http.Request) {
		_CurrentFile.Save()
		_CurrentFile.Close()
		_SheetsDataMap, _KeyMap, _CurrentFile = getFileData("assets/mainmain.xlsx", SHEETNAMES)
		output, err := json.Marshal("done")
		if err != nil{
			fmt.Println(err)
			return
		}
		w.Write(output)
	})

	http.HandleFunc("/search/", func(w http.ResponseWriter, r *http.Request) {
		inputBit, err := io.ReadAll(r.Body)
		if err != nil {
			fmt.Println(err)
			return
		}

		var Input map[string]string
		err = json.Unmarshal(inputBit, &Input)
		if err != nil {
			fmt.Println(err)
			return
		}

		var filters map[string]string
		err = json.Unmarshal([]byte(Input["filters"]), &filters)
		if err != nil {
			fmt.Println(err)
			return
		}

		var sheetCheckBoxes map[string]bool
		err = json.Unmarshal([]byte(Input["checkedSheets"]), &sheetCheckBoxes)
		if err != nil {
			fmt.Println(err)
			return
		}

		type sendType struct {
			Keyset []string
			Data map[string]mainDataType
		}

		processedSheets := make(map[string]mainDataType) 
		var selectedSheets []string

		for sheetName, selected := range sheetCheckBoxes {
			if selected {
				selectedSheets = append(selectedSheets, sheetName)
				processedSheets[sheetName] = getFilteredDataFromSheet(sheetName, _SheetsDataMap, _KeyMap[sheetName], Input["search"], filters) 
			}
		}
		OUTPUT, err := json.Marshal(sendType{combineKeysets(selectedSheets, _KeyMap), processedSheets})
		if err != nil {
			fmt.Println(err)
			return
		}

		w.Write(OUTPUT)
	})

	fmt.Println("A szerver elindult: http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
