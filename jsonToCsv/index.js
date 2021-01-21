
let dropZone = document.querySelector(".dropZone");
console.log("dropZone", dropZone);

const highlightDropzone = (highlight) => {
	if (highlight)
		dropZone.classList.add("highlight");
	else 
		dropZone.classList.remove("highlight");
}


// Optional.   Show the copy icon when dragging over.  Seems to only work for chrome.
dropZone.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
	highlightDropzone(true);
});

dropZone.addEventListener('dragleave', function(e) {
    e.stopPropagation();
    e.preventDefault();
	highlightDropzone(false);
});

// Get file data on drop
dropZone.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();
	highlightDropzone(false);
    var files = e.dataTransfer.files; // Array of all files
	console.log("files", files.length)

	let objs = [];

	const tryFinish = () => {
		for (let obj of objs)
			if (obj === undefined) return;
		console.log("finished")
		let keys = [];
		for (let obj of objs) {
			let k = Object.keys(obj);
			for (let key of k)
				if (keys.includes(key) === false)
					keys.push(key)
		}
		let table = [];
		table.push(keys)
		for (let obj of objs) {
			let row = [];
			for (let key of keys)
				row.push(("" + (obj[key] ?? "")).replace("\"", "\"\""));// csvs need double-double quotes to escape
			table.push(row);
		}

		let csv = "";
		for (let row of table)
			csv += "\"" + row.join("\",\"") + "\"\r\n";

		console.log("csv", csv);
		let blob = new Blob([csv], {type: "text/csv"});
		let url = window.URL.createObjectURL(blob);
		saveAs(url, "json.csv")
	}

    for (var i=0, file; file=files[i]; i++) {
        if (file.type === "application/json") {
			var reader = new FileReader();
			objs[i] = undefined;

            reader.onload = ((j) => {
				return (readerEvent) => {
					console.log("onload", j)
					let json = JSON.parse(readerEvent.target.result);
					objs[j] = json;
					tryFinish();
				}
            })(i)

            reader.readAsText(file); // start reading the file data.
        }
    }
});

function saveAs(uri, filename) {
    var link = document.createElement('a');
    if (typeof link.download === 'string') {
        document.body.appendChild(link); // Firefox requires the link to be in the body
        link.download = filename;
        link.href = uri;
        link.click();
        document.body.removeChild(link); // remove the link when done
    } else {
        location.replace(uri);
    }
}