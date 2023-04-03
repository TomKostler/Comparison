const express = require("express");
var wikiParser = require("wiki-infobox-parser");
const fetch = require("node-fetch");


/***********/
/* REQUEST */
/***********/
// to Wikipedia


const urlContent = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exlimit=1&origin=*&redirects=resolve&explaintext=1&format=json&formatversion=2&titles=";
const urlSearch = "https://en.wikipedia.org/w/api.php?action=opensearch&origin=*&explaintext=1&format=json&formatversion=2&redirects=resolve&search=";
const urlDisambiguation = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exlimit=1&origin=*&redirects=resolve&explaintext=1&format=json&formatversion=2&prop=categories&titles=";



var referencePoints = [];
var keywords = [];



/*************/
/* Algorithm */
/*************/


function searchInText(word, text) {
	text = text.replaceAll(/====(.+?)====/g, "");
	text = text.replaceAll(/===(.+?)===/g, "");
	text = text.replaceAll(/==(.+?)==/g, "");
	text = text.replaceAll(/=(.+?)=/g, "");

	const sentenceArray = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");


	for (let i = 0; i < sentenceArray.length; i++) {
		if (sentenceArray[i].includes(word.charAt(0).toLowerCase() + word.substring(1, word.length)) || sentenceArray[i].includes(word.charAt(0).toUpperCase() + word.substring(1, word.length))) {
			return [sentenceArray[i]];
		}
	}

	return [];
}


function compare(term, text, referencePoints) {
	var output = {
		keywords: referencePoints
	};
	var arr = [];

	for (let i = 0; i < referencePoints.length; i++) {
		arr.push(searchInText(referencePoints[i], text).join(" "));
	}

	output["arr"] = arr;
	return output;
}





/*************/
/* WEBSERVER */
/*************/

const app = express();
const port = 3000;

app.listen(port, () => {
	console.log("Application started and Listening on port 3000");
});


app.use(express.static("/Users/tomkostler/Documents/Coding/Javascript/Comparison/"));
app.use(express.json());




function sendFailed(res, keyword) {
	res.status(200).json({
		status: "failed",
		terms: [keyword],
		resultL: "",
		resultR: ""
	});
}

function sendOutput(res, termL, termR, outputL, outputR) {
	res.status(200).json({
		status: "success",
		terms: [termL, termR],
		resultL: outputL,
		resultR: outputR
	});
}






/*****************/
/* DRIVER'S CODE */
/*****************/

//When "Compare"-Button on Client being clicked
app.post("/", (req, res) => {
	const {
		parcel
	} = req.body;
	if (!parcel) {
		return res.status(400).send({
				status: "failed"
			})
	}
	keywords = parcel.split("/");

	var referencePoints = keywords[2].split(", ");
	console.log("Reference Points ", referencePoints);


	async function callAPI() {
		//get the correct page-name of keywords
		let pageNameLInfo = await getWikiData(keywords[0], urlSearch, res);
		let pageNameRInfo = await getWikiData(keywords[1], urlSearch, res);

		var pageNameL = pageNameLInfo[1][0];
		var pageNameR = pageNameRInfo[1][0];
		console.log("Page Names: ", pageNameL, pageNameR);


		//check for disambiguation page:
		let flagDisambiguationL = await getWikiData(pageNameL, urlDisambiguation, res);
		let flagDisambiguationR = await getWikiData(pageNameR, urlDisambiguation, res);

		if (flagDisambiguationL.query.pages[0].categories[0].title.indexOf("disambiguation") > -1) {
			pageNameL = await disambiguationPage(pageNameL, res);
		}
		if (flagDisambiguationR.query.pages[0].categories[0].title.indexOf("disambiguation") > -1) {
			pageNameR = await disambiguationPage(pageNameR, res);
		}




		//get the content of pages => content query
		let pageContentLInfo = await getWikiData(pageNameL, urlContent, res);
		let pageContentRInfo = await getWikiData(pageNameR, urlContent, res);


		var pageContentL = pageContentLInfo.query.pages[0].extract;
		var pageContentR = pageContentRInfo.query.pages[0].extract;


		
		//check for infoboxes with wikiparser (only with callback!) and send all the results back to client
		searchInfoboxes(pageNameL, pageNameR, pageContentL, pageContentR, referencePoints, res);

	}
	
	callAPI();
});






async function disambiguationPage(term, res) {
	let resultInfo = await getWikiData(term, urlContent, res);

	//finde den neuen page_Name
	var result = resultInfo.query.pages[0].extract;
	let start = result.indexOf(":");
	let end = result.indexOf(", ", start);

	return result.substring(start+3, end);

}





async function getWikiData(keyword, url, res) {
	try {
		const response = await fetch(url + keyword);
		const json = await response.json();
		return json;

	} catch (error) {
		//an error occured during the fetch
		sendFailed(res, keyword);
	}
}


function searchInfoboxes(termL, termR, contentL, contentR, referencePoints, res) {

	wikiParser(termL, function(err, resultL) {
		if (err) {
			console.error(err.message);
			var outputL = compare(termL, contentL, referencePoints);
			var outputR = compare(termR, contentR, referencePoints);

			sendOutput(res, termL, termR, outputL, outputR);


		} else {
			//Infobox for page left(L) is there
			var outputL = {
				keywords: referencePoints
			};
			var infoboxL = JSON.parse(resultL);

			outputL["arr"] = getOutputInfobox(infoboxL, contentL, referencePoints);
			//console.log(outputL);


			wikiParser(termR, function(err, resultR) {
				if (err) {
					console.error(err.message);
					var outputR = compare(termR, contentR, referencePoints);
					sendOutput(res, termL, termR, outputL, outputR);

				} else {
					//infobox for page right(R) is there
					var outputR = {
						keywords: referencePoints
					};
					var infoboxR = JSON.parse(resultR);
					outputR["arr"] = getOutputInfobox(infoboxR, contentR, referencePoints);
					//console.log(outputR);


					//finally: Send all the requested Data back to Client
					sendOutput(res, termL, termR, outputL, outputR);
				}
			});
		}
	});
}	




function getOutputInfobox(infobox, content, referencePoints) {
	var arr = [];
	for (let i = 0; i < referencePoints.length; i++) {
		//first search in infobox
		let flag = false;
		for (title in infobox) {
			if (title.includes(referencePoints[i].charAt(0).toLowerCase() + referencePoints[i].substring(1, referencePoints[i].length)) || title.includes(referencePoints[i].charAt(0).toUpperCase() + referencePoints[i].substring(1, referencePoints[i].length))) {
				arr.push(title.toString() + ": " + infobox[title]);
				flag = true;
				break;
			}
		}

		//second: if iformation not in the infobox, scan the text
		if (flag == false) {
			arr.push(searchInText(referencePoints[i], content));
		}
	}
	return arr;
}

