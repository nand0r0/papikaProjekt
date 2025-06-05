package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/xuri/excelize/v2"
)

// [rowcount -> [elementkey -> itemvalue]]
type mainDataType map[string]map[string]string

func main() {
	fmt.Println("Betöltés...")

	fs := http.FileServer(http.Dir("assets"))
	http.Handle("/assets/", http.StripPrefix("/assets", fs))
	file, err := excelize.OpenFile("assets/mainmain.xlsx")
	if err != nil {
		fmt.Printf("%v Press enter to exit.", err)
		fmt.Scanln()
		os.Exit(1)
	}

	sections := []string{"VKK", "templom", "látnivalók", "VKKBudapest", "MOn kívüli magyar", "elbontott"}

	//sectionName -> sectionData
	SECTIONMAP := make(map[string][][]string)

	//sectionName -> sectionKeyset
	KEYMAP := make(map[string][]string)
	
	var wg sync.WaitGroup

	for _, Section := range sections {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rows, err := file.GetRows(Section)
			if err != nil {
				fmt.Println(err)
				return
			}
			SECTIONMAP[Section] = rows

			for i, row := range rows {	
				if i > 0 {break}
				
				for _, el := range row {
					if el == "határ" {break}
					KEYMAP[Section] = append(KEYMAP[Section], el)
				}
			}
		}()
	}
	
	wg.Wait()	

	fmt.Println("Kész!")

	

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		
		tmpl := template.Must(template.ParseFiles("assets/index.html"))
		tmpl.Execute(w, "")
	})

	http.HandleFunc("/base/", func(w http.ResponseWriter, r *http.Request) {
		sendData, err := json.Marshal([][]string{combineAllKeysets(KEYMAP), sections})
		if err != nil {
			fmt.Println(err)
			return
		}
		w.Write(sendData)
	})

	http.HandleFunc("/save/", func(w http.ResponseWriter, r *http.Request) {
		//last task

		x := "hello"
		w.Write([]byte{x[0], x[1]})
	})

	http.HandleFunc("/search/", func(w http.ResponseWriter, r *http.Request) {
		inputBit, err := io.ReadAll(r.Body)
		if err != nil {
			fmt.Println(err)
			return
		}

		var INPUT map[string]string
		err = json.Unmarshal(inputBit, &INPUT)
		if err != nil {
			fmt.Println(err)
			return
		}

		var filters map[string]string
		err = json.Unmarshal([]byte(INPUT["filters"]), &filters)
		if err != nil {
			fmt.Println(err)
			return
		}

		var sectionCheckBoxes map[string]bool
		err = json.Unmarshal([]byte(INPUT["checkedSections"]), &sectionCheckBoxes)
		if err != nil {
			fmt.Println(err)
			return
		}

		type sendType struct {
			Keyset []string
			Data map[string]mainDataType
		}

		processedSections := make(map[string]mainDataType) 
		var selectedSections []string

		for section, selected := range sectionCheckBoxes {
			if selected {
				selectedSections = append(selectedSections, section)
				processedSections[section] = getDataFromSection(section, SECTIONMAP, KEYMAP[section], INPUT["search"], filters) 
			}
		}

		OUTPUT, err := json.Marshal(sendType{combineKeysets(selectedSections, KEYMAP), processedSections})
		if err != nil {
			fmt.Println(err)
			return
		}

		w.Write(OUTPUT)
	})

	fmt.Println("A szerver elindult: http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
