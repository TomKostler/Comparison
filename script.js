var lang = "Deutsch";


function printInfo(data) {
    var table = document.getElementById("tableInfo");
    

    //delete all old rows, so that new ones can be added
    while(table.hasChildNodes()) {
        table.removeChild(table.firstChild);
    }


    table.style.display = "inline";

    //Create Table Head
    var tHead = table.createTHead();
    let tHeadR = table.insertRow();
    tHeadR.insertCell();
    let cIL = tHeadR.insertCell();
    let cIR = tHeadR.insertCell();

    let nodeIL = document.createTextNode(data.terms[0].toUpperCase());
    cIL.appendChild(nodeIL);

    let nodeIR = document.createTextNode(data.terms[1].toUpperCase());
    cIR.appendChild(nodeIR);


    let dataL = data.resultL;
    let dataR = data.resultR;


    console.log(data);
    for (let i = 0; i < data.resultL.keywords.length; i++) {

        let r = table.insertRow();

        //create the 3 cells
        let cK = r.insertCell();
        let nodeK = document.createTextNode(dataL.keywords[i].toUpperCase());
        cK.appendChild(nodeK);

        let cL = r.insertCell();
        let nodeKL = document.createTextNode(dataL.arr[i]);
        cL.appendChild(nodeKL);

        let cR = r.insertCell();
        let nodeKR = document.createTextNode(dataR.arr[i]);
        cR.appendChild(nodeKR);
    }
}


//überprüfe, ob input Felder leer
function checkInput() {
    let input1 = document.getElementById("inputL");
    let inputR = document.getElementById("inputR");
    let inputRefernce = document.getElementById("inputReferencePoints");

    if (inputL.value == "" || inputR.value == "" || inputRefernce.value == "") {
        return false;
    }
    return true;
}





async function postInfo(e) {
    const res = await fetch("http://localhost:3000/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            parcel: document.getElementById("inputL").value + "/" + document.getElementById("inputR").value + "/" + document.getElementById("inputReferencePoints").value,
            language: lang
        })
    });

    const data = await res.json();

    if (data.status == "failed") {
        console.log("FAILED");
        document.getElementById("labelFailed").innerHTML = "Sorry, Wikipedia doesn't seem to have the article " + data.terms[0] + "!";
    } else {
        document.getElementById("labelFailed").innerHTML = "";
        printInfo(data);
    }
}



document.getElementById("btnCompare").addEventListener("click", function() {
    if (checkInput()) {
        postInfo();
    } else {
        document.getElementById("labelFailed").innerHTML = "Please fill out all the input-boxes!";
    }
});

/*
document.getElementById("btnChangeLang").addEventListener("click", function() {
    if (lang == "Deutsch") {
        lang = "Englisch";
        document.getElementById("btnChangeLang").innerHTML = "Sprache: Englisch";
    } else {
        lang = "Deutsch";
        document.getElementById("btnChangeLang").innerHTML = "Sprache: Deutsch";
    }
}); */



