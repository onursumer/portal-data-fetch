var webPage = require('webpage');
var fs = require('fs');
//var process = require('process');
var system = require('system');
var minimist = require('minimist');
var _ = require('underscore');

function main(args)
{
	// process args
	var baseUrl = args["base-url"] || args["b"] || "http://www.cbioportal.org/private/webservice.do";
	var username = args["username"] || args["u"];
	var password = args["password"] || args["p"];
	var geneInput = args["gene-input"] || args["g"];
	var studyInput = args["study-input"] || args["s"];
	var outputDir = args["output-dir"] || args["o"] || ".";

	if (geneInput == null || geneInput.length == 0 ||
		studyInput == null || studyInput.length == 0)
	{
		invalidArgs();
		phantom.exit(-1);
	}

	var skipSignIn = (username == null || username.length == 0 ||
		password == null || password.length == 0);

	// read input files
	var studies = parseInput(studyInput);
	var genes = parseInput(geneInput);
	var page = webPage.create();

	// map for <study, profile_ids> pairs
	var profiles = {};

	// for each study, find out all profiles (genetic_profile_id)
	console.log("[" + new Date() + "] retrieving genetic profiles ids for all given studies");
	getProfileIds(page, _.clone(studies), profiles, function(profiles) {
		console.log("[" + new Date() + "] retrieving mutation data for for all given studies");
		getMutationData(page, profiles, genes, function(mutationData) {
			writeToDir(mutationData, outputDir, "mutation");
			console.log("[" + new Date() + "] retrieving CNA data for for all given studies");
			getCopyNumberData(page, profiles, genes, function(cnaData) {
				writeToDir(cnaData, outputDir, "CNA");
				page.close();
				phantom.exit(0);
			}, true);
		}, true);
	}, skipSignIn);

	function writeToDir(data, output, type)
	{
		console.log("[" + new Date() + "] writing " + type + " data to the output directory: " + output);

		_.each(_.pairs(data), function(pair) {
			var filename = pair[0] + "_" + type;

			fs.write(output + "/" + filename, pair[1], 'w');
		});

	}

	function getMutationData(page, profiles, genes, callback, skipSignIn)
	{
		// map for <study, mutation_data> pairs
		var mutationData = {};

		// for each genetic profile, get mutation data
		getGeneticProfileData(page, "getMutationData", _.pairs(profiles), genes, mutationData, getMutationProfileId, callback, skipSignIn);
	}

	function getCopyNumberData(page, profiles, genes, callback, skipSignIn)
	{
		// map for <study, cna_data> pairs
		var cnaData = {};

		// for each genetic profile, get profile data
		getGeneticProfileData(page, "getProfileData", _.pairs(profiles), genes, cnaData, getCnaProfileId, callback, skipSignIn);
	}

	function getGeneticProfileData(page, cmd, profiles, genes, profileData, profileIdFn, callback, skipSignIn)
	{
		var pair = profiles.pop();
		var studyId = pair[0];
		var caseSetId = studyId + "_all";
		var profileId = profileIdFn(pair[1]);

		if (profileId == null)
		{
			console.log("[" + new Date() + "] WARNING: No matching profile id for " + studyId);
		}

		var queryString = constructQueryString(cmd, genes, [profileId], caseSetId);

		fetchData(page, queryString, function(data) {
			profileData[studyId] = data;

			if (profiles.length > 0)
			{
				// recursively process remaining profiles
				// (always skip sign in for the rest of the process)
				getGeneticProfileData(page, cmd, profiles, genes, profileData, profileIdFn, callback, true);
			}
			else
			{
				// done processing profiles, callback time...
				if (_.isFunction(callback))
				{
					callback(profileData);
				}
			}
		}, skipSignIn);
	}

	function getCnaProfileId(profiles)
	{
		var profile = _.find(profiles, function(profile, idx) {
			return (profile.toLowerCase().indexOf("_gistic") != -1);
		});

		if (profile == null)
		{
			profile = _.find(profiles, function(profile, idx) {
				return (profile.toLowerCase().indexOf("_cna") != -1);
			});
		}

		if (profile == null)
		{
			profile = _.find(profiles, function(profile, idx) {
				return (profile.toLowerCase().indexOf("_log2cna") != -1);
			});
		}

		return profile;
	}

	function getMutationProfileId(profiles)
	{
		return _.find(profiles, function (profile, idx)
		{
			return (profile.toLowerCase().indexOf("_mutation") != -1);
		});
	}

	function getProfileIds(page, studies, profiles, callback, skipSignIn)
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
				// (always skip sign in for the rest of the process)
				getProfileIds(page, studies, profiles, callback, true);
			}
			else
			{
				// done processing studies, callback time...
				if (_.isFunction(callback))
				{
					callback(profiles);
				}
			}
		}, skipSignIn);
	}

	function getCombinedMutationData(page, studies, genes, output, callback, skipSignIn)
	{
		var mutationProfiles = constructMutationProfiles(studies);
		var queryString = constructQueryString("getMutationData", genes, mutationProfiles);

		// fetch & output the data
		fetchData(page, queryString, function(data) {
			console.log("[" + new Date() + "] writing data to the output: " + output);
			fs.write(output, data, 'w');

			if (_.isFunction(callback))
			{
				callback(data);
			}
		}, skipSignIn);
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

	function invalidArgs()
	{
		console.log("ERROR: Invalid or missing arguments.\n");

		var usage = [];

		usage.push("Usage:");
		usage.push('-b, --base-url <url>: URL for the cBioPortal web service.');
		usage.push('-g, --gene-input <path>: Path for the input file containing a list of genes.');
		usage.push('-s, --study-input <path>: Path for the input file containing a list of studies.');
		usage.push('-o, --output <path>: Path for the output directory.');
		usage.push('-u, --username <string>: Google username.');
		usage.push('-p, --fragment-filter <string>: Google password.');

		console.log(usage.join("\n"));
	}
}

//main(minimist(process.argv.slice(2)));
main(minimist(system.args.slice(1)));