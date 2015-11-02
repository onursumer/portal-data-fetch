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
	var mutationOut = args["mutation-output"] || args["m"];
	var cnaOut = args["cna-output"] || args["c"];

	// read input files
	var studies = parseInput(studyInput);
	var genes = parseInput(geneInput);
	var page = webPage.create();

	getMutationData(page, studies, genes, mutationOut, function(mutationData) {
		getCopyNumberData(page, studies, genes, cnaOut, function(cnaData) {
			phantom.exit(0);
		});
	});

	function getCopyNumberData(page, studies, genes, output, callback)
	{
		// map for <study, profile_ids> pairs
		var profiles = {};

		// map for <study, cna_data> pairs
		var cnaData = {};

		// for each study, find out all CNA related profiles (genetic_profile_id)
		console.log("[" + new Date() + "] retrieving genetic profiles ids for all given studies");

		getProfileIds(page, _.clone(studies), profiles, function(profiles) {
			console.log("[" + new Date() + "] retrieving CNA data for for all given studies");

			// for each genetic profile, get profile data
			getGeneticProfileData(page, _.pairs(profiles), genes, cnaData, function(cnaData) {
				// TODO parse, format, output the data
				console.log("[" + new Date() + "] writing data to the output: " + output);
				fs.write(output, JSON.stringify(cnaData), 'w');

				if (_.isFunction(callback))
				{
					callback(cnaData);
				}
			});
		});
	}

	function getGeneticProfileData(page, profiles, genes, cnaData, callback)
	{
		var pair = profiles.pop();
		var cmd = "getProfileData";
		var studyId = pair[0];
		var caseSetId = studyId + "_all";
		var profileId = pair[1][0]; // TODO pick the proper profile ID for CNA data...

		var queryString = constructQueryString(cmd, genes, [profileId], caseSetId);

		fetchData(page, queryString, function(data) {
			// TODO process data?
			//var lines = data.trim().split(/[\n]+/);
			cnaData[studyId] = data;

			if (profiles.length > 0)
			{
				// recursively process remaining profiles
				getGeneticProfileData(page, profiles, genes, cnaData, callback);
			}
			else
			{
				// done processing profiles, callback time...
				if (_.isFunction(callback))
				{
					callback(cnaData);
				}
			}
		}, true);
	}

	function getProfileIds(page, studies, profiles, callback)
	{
		var studyId = studies.pop();
		var queryString = "cmd=getGeneticProfiles&cancer_study_id=" + studyId;

		fetchData(page, queryString, function(data) {
			var lines = data.trim().split(/[\n]+/);
			profiles[studyId] = [];

			// extract only profile ids
			// (assuming first line is the header line)
			_.each(lines.slice(1), function(line, lineIdx) {
				var cols = line.split(/[,\s+]+/);

				// assuming the first column is the genetic_profile_id
				if (cols.length > 0 && cols[0].length >0)
				{
					profiles[studyId].push(cols[0]);
				}
			});

			if (studies.length > 0)
			{
				// recursively process remaining studies
				getProfileIds(page, studies, profiles, callback);
			}
			else
			{
				// done processing studies, callback time...
				if (_.isFunction(callback))
				{
					callback(profiles);
				}
			}
		}, true);
	}

	function getMutationData(page, studies, genes, output, callback)
	{
		var mutationProfiles = constructMutationProfiles(studies);
		var queryString = constructQueryString("getMutationData", genes, mutationProfiles);

		// fetch & output the data
		fetchData(page, queryString, function(data) {
			// TODO format data before writing to output?
			console.log("[" + new Date() + "] writing data to the output: " + output);
			fs.write(output, data, 'w');

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

	function fetchData(page, queryString, callback, skipSignIn)
	{
		var next = skipSignIn || false;
		var signedIn = skipSignIn || false;

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
				console.log("[" + new Date() + "] signing into Google as '" + username + "'");

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
				console.log("[" + new Date() + "] retrieving data from the cBioPortal web API...");
				var data = page.evaluate(function() {
					return document.getElementsByTagName("pre")[0].innerText;
				});

				if (_.isFunction(callback))
				{
					callback(data);
				}
			}
		};

		page.open(baseUrl + "?" + queryString);
	}
}

//main(minimist(process.argv.slice(2)));
main(minimist(system.args.slice(1)));