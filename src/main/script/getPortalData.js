var webPage = require('webpage');
var fs = require('fs');
//var process = require('process');
var system = require('system');
var minimist = require('minimist');
var _ = require('underscore');

function main(args)
{
	// process args
	var baseUrl = args["base-url"] || "http://www.cbioportal.org/private/webservice.do";
	var username = args["username"] || args["u"];
	var password = args["password"] || args["p"];
	var geneInput = args["gene-input"] || args["g"];
	var studyInput = args["study-input"] || args["s"];
	var output = args["output"] || args["o"];

	// read input files
	var studies = parseInput(studyInput);
	var genes = parseInput(geneInput);

	getMutationData(studies, genes, output, function(data) {
		phantom.exit(0);
	});

	function getCopyNumberData(studies, genes, output, callback)
	{
		// TODO for each study, find out all CNA related profiles (genetic_profile_id)
		var cmd = "getProfileData";

		// TODO get data with multiple requests, and combine data in a single output
		var caseSetId = ""; // (case_set_id) "..._all"
	}

	function getMutationData(studies, genes, output, callback)
	{
		var mutationProfiles = constructMutationProfiles(studies);
		var queryString = constructQueryString("getMutationData", genes, mutationProfiles);

		// create the web page
		var page = webPage.create();

		// fetch & output the data
		fetchData(page, queryString, function(data) {
			// TODO parse, format, output the data
			console.log("[" + new Date() + "] writing data to the output: " + output);
			fs.write(output, data, 'w');
			page.close();

			if (_.isFunction(callback))
			{
				callback(data);
			}
		});
	}

	function parseInput(input)
	{
		var content = fs.read(input);
		return content.trim().split(/[,\s+]+/);
	}

	function constructMutationProfiles(studies)
	{
		var profiles = [];
		_.each(studies, function(ele, idx) {
			profiles.push(ele + "_mutations");
		});
		return profiles;
	}

	function constructQueryString(cmd, genes, profiles, caseSetId)
	{
		return "cmd=" + cmd +
			"&genetic_profile_id=" + profiles.join("+") +
			"&gene_list=" + genes.join("+") +
			"&case_set_id=" + caseSetId;
	}

	function fetchData(page, queryString, callback)
	{
		var next = false;
		var signedIn = false;

		page.onLoadFinished = function(status) {
			if (status != "success")
			{
				// TODO there is something wrong!
				console.log("[" + new Date() + "] something went wrong!");
				phantom.exit(1);
			}

			if (!next)
			{
				console.log("[" + new Date() + "] entering the cBioPortal page...");

				next = page.evaluate(function() {
					if (window.location.pathname.indexOf("login.jsp") != -1)
					{
						// assuming the first button on this page is the login button
						var elems = document.getElementsByTagName('button');
						elems[0].click();
						return true;
					}
					return false;
				});
			}
			else if (!signedIn)
			{
				console.log("[" + new Date() + "] signing in to Google as '" + username + "'");

				signedIn = page.evaluate(function(args) {
					function signIn()
					{
						var pwdInput = document.getElementById("Passwd");
						var signInButton = document.getElementById("signIn");

						if (pwdInput != null &&
						    signInButton != null)
						{
							pwdInput.setAttribute("value", args.password);
							signInButton.click();
						}
					}

					if (window.location.pathname.indexOf("ServiceLogin") != -1)
					{
						// this is the google login page
						document.getElementById("Email").setAttribute("value", args.username);
						document.getElementById("next").click();
						setTimeout(signIn, 500);
						return true;
					}

					return false;
				}, {username: username, password: password});
			}
			// here, we are assuming that we reached to the actual data page
			else
			{
				console.log("[" + new Date() + "] retrieving data from cBioPortal...");
				var data = page.evaluate(function() {
					return document.getElementsByTagName("pre")[0].innerText;
				});

				callback(data);
			}
		};

		page.open(baseUrl + "?" + queryString);
	}
}

//main(minimist(process.argv.slice(2)));
main(minimist(system.args.slice(1)));