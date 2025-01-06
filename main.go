package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/xuri/excelize/v2"
)

// [rowcount -> [elementkey -> itemvalue]]
type mainDataType map[string]map[string]string

type row [][]string

func main() {
	file, err := excelize.OpenFile("mainmain.xlsx")
	if err != nil {
		fmt.Printf("%v Press enter to exit.", err)
		fmt.Scanln()
		os.Exit(1)
	}
		
	rows, err := file.GetRows("VKK")
	if err != nil {
		fmt.Println(err)
		return
	}
	
	keys := getKeys(rows)
	
	searchParams := []string{"országrész", "vármegye1914", "járás1914", "helység", "VKK"} 
	sections := []string{"VKK", "templom", "látnivalók", "VKKBudapest", "MOn kívüli magyar", "elbontott"}
		
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl := template.Must(template.ParseFiles("assets/index.html"))
		tmpl.Execute(w, map[string]string{
			"keys": convertListToString(keys), 
			"searchParams": convertListToString(searchParams),
			"sections": convertListToString(sections),
		})
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

		final := make(mainDataType)

		output := getSection(file, INPUT["section"], keys)
		
		for row, DATA := range output {
			for _, value := range DATA {
				if strings.Contains(strings.ToLower(value), strings.ToLower((INPUT["search"]))) {	
					if isFilterInData(filters, DATA) {
						final[row] = DATA
					}
					break
				}
			}
		}

		index := &output
		*index = mainDataType{}

		OUTPUT, err := json.Marshal(final)

		if err != nil {
			fmt.Println(err)
			return
		}

		w.Write(OUTPUT)
	})
	
	log.Println("A szerver elindult: http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil)) 	
}




