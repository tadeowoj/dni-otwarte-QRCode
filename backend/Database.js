/**
 * Database.js - warstwa abstrakcji do obsługi arkusza Google Sheets
 */

const DB = {
  // Funkcja uniwersalna zwracająca arkusz
  getSheet(sheetName) {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  },

  // Konwersja danych z arkusza na Array Of Objects
  getRowsAsObjects(sheetName) {
    const sheet = this.getSheet(sheetName);
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; // Tylko nagłówki
    
    const headers = data[0];
    const rows = [];
    
    for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = rowData[j];
        }
        // Zapisujemy row index aby muc łatwo aktualizować (offset dla nagłówka = 2)
        obj._rowIndex = i + 1;
        rows.push(obj);
    }
    return rows;
  },

  // Dodawanie nowego wiersza (np. dla Uczestnicy lub Skanowania)
  insertRow(sheetName, newObject) {
    const sheet = this.getSheet(sheetName);
    if (!sheet) throw new Error("Arkusz " + sheetName + " nie istnieje");
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = [];
    
    for (let i = 0; i < headers.length; i++) {
      const headerName = headers[i];
      // Wypełniamy wartościami podanymi w obiekcie, w przeciwnym razie puste wstawki
      newRow.push(newObject[headerName] !== undefined ? newObject[headerName] : "");
    }
    
    sheet.appendRow(newRow);
    return true;
  },

  // Aktualizacja istniejącego rekordu (wymaga podania indeksu wiersza z getDataAsObjects)
  updateRow(sheetName, rowIndex, updateObject) {
    const sheet = this.getSheet(sheetName);
    if (!sheet) return false;
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    for (let key in updateObject) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        // Kolumny w GAS indeksowane od 1
        sheet.getRange(rowIndex, colIndex + 1).setValue(updateObject[key]);
      }
    }
    return true;
  },

  // Odczyt ustawienia na podstawie klucza
  getSetting(key) {
    const sheet = this.getSheet('Ustawienia');
    if(!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }
    return null;
  }
};
