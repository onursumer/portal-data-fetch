var webPage = require('webpage');
var fs = require('fs');
var process = require('process');
var system = require('system');
var minimist = require('minimist');

function main(args)
{
	var baseUrl = args["base-url"] || "http://www.cbioportal.org/private/webservice.do";
	var username = args["username"] || args["u"];
	var password = args["password"] || args["p"];
	var input = args["input"] || args["i"];
	var cmd = args["cmd"];
	var page = webPage.create();

	// TODO get these from an input file...
	var queryString =
		"cmd=getMutationData&" +
		"genetic_profile_id=sarc_tcga_mutations+acc_tcga_mutations+chol_tcga_mutations+blca_tcga_mutations+coadread_tcga_mutations+brca_tcga_mutations+cesc_tcga_mutations+lgg_tcga_mutations+pcpg_tcga_mutations+hnsc_tcga_mutations+lihc_tcga_mutations+paad_tcga_mutations+meso_tcga_mutations+prad_tcga_mutations+tgct_tcga_mutations+thca_tcga_mutations+ucec_tcga_mutations+laml_tcga_mutations+esca_tcga_mutations+stad_tcga_mutations+uvm_tcga_mutations+kirc_tcga_mutations+luad_tcga_mutations+lusc_tcga_mutations+skcm_tcga_mutations+thym_tcga_mutations+ucs_tcga_mutations+gbm_tcga_mutations+kich_tcga_mutations+kirp_tcga_mutations+dlbc_tcga_mutations+ov_tcga_mutations+cellline_cclp_sanger_mutations+cellline_nci60_mutations&" +
		"gene_list=ABI1+ABL1+ABL2+ACKR3+ACSL3+ACSL6+ACVR1+AFF1+AFF3+AFF4+AKAP9+AKT1+AKT2+ALDH2+ALK+AMER1+APC+ARHGAP26+ARHGEF12+ARID1A+ARID1B+ARID2+ARNT+ASPSCR1+ASXL1+ATF1+ATIC+ATM+ATP1A1+ATP2B3+ATR+ATRX+AXIN1+AXIN2+BAP1+BCL10+BCL11A+BCL11B+BCL2+BCL3+BCL5+BCL6+BCL7A+BCL9+BCOR+BCR+BIRC3+BLM+BMPR1A+BRAF+BRCA1+BRCA2+BRD3+BRD4+BRIP1+BTG1+BUB1B+C15orf65+C2orf44+CACNA1D+CALR+CAMTA1+CANT1+CARD11+CARS+CASC5+CASP8+CBFA2T3+CBFB+CBL+CBLB+CBLC+CCDC6+CCNB1IP1+CCND1+CCND2+CCND3+CCNE1+CD274+CD74+CD79A+CD79B+CDC73+CDH1+CDH11+CDK12+CDK4+CDK6+CDKN1B+CDKN2A+CDKN2C+CDKN2a+CDX2+CEBPA+CEP89+CHCHD7+CHEK2+CHIC2+CHN1+CIC+CIITA+CLIP1+CLP1+CLTC+CLTCL1+CNBP+CNOT3+CNTRL+COL1A1+COL2A1+COX6C+CREB1+CREB3L1+CREB3L2+CREBBP+CRLF2+CRTC1+CRTC3+CSF3R+CTNNB1+CUX1+CYLD+DAXX+DCTN1+DDB2+DDIT3+DDX10+DDX5+DDX6+DEK+DICER1+DNM2+DNMT3A+DUX4L1+EBF1+ECT2L+EGFR+EIF3E+EIF4A2+ELF4+ELK4+ELL+ELN+EML4+EP300+EPS15+ERBB2+ERBB3+ERC1+ERCC2+ERCC3+ERCC4+ERCC5+ERG+ESR1+ETNK1+ETV1+ETV4+ETV5+ETV6+EWSR1+EXT1+EXT2+EZH2+EZR+FAM131B+FAM46C+FANCA+FANCC+FANCD2+FANCE+FANCF+FANCG+FAS+FBXO11+FBXW7+FCGR2B+FCRL4+FEV+FGFR1+FGFR1OP+FGFR2+FGFR3+FGFR4+FH+FHIT+FIP1L1+FLCN+FLI1+FLT3+FLT4+FNBP1+FOXA1+FOXL2+FOXO1+FOXO3+FOXO4+FOXO4+FOXP1+FSTL3+FUBP1+FUS+GAS7+GATA1+GATA2+GATA3+GMPS+GNA11+GNAQ+GNAS+GOLGA5+GOPC+GPC3+GPHN+GRIN2A+H3F3A+H3F3B+HERPUD1+HEY1+HIP1+HIST1H3B+HIST1H4I+HLA-A+HLF+HMGA1+HMGA2+HMGN2P46+HNF1A+HNRNPA2B1+HOOK3+HOXA11+HOXA13+HOXA9+HOXC11+HOXC13+HOXD11+HOXD13+HRAS+HSP90AA1+HSP90AB1+IDH1+IDH2+IGH+IGK+IGL+IKBKB+IKZF1+IL2+IL21R+IL6ST+IL7R+IRF4+ITK+JAK1+JAK2+JAK3+JAZF1+JUN+KAT6A+KAT6B+KCNJ5+KDM5A+KDM5C+KDM6A+KDR+KDSR+KIAA1549+KIAA1598+KIF5B+KIT+KLF4+KLF6+KLK2+KMT2A+KMT2C+KMT2D+KRAS+KTN1+LASP1+LCK+LCP1+LHFP+LIFR+LMNA+LMO1+LMO2+LPP+LRIG3+LSM14A+LYL1+MAF+MAFB+MALAT1+MALT1+MAML2+MAP2K1+MAP2K2+MAP2K4+MAP3K1+MAP3K13+MAX+MDM2+MDM4+MDS2+MECOM+MED12+MEN1+MET+MITF+MKL1+MLF1+MLH1+MLLT1+MLLT10+MLLT11+MLLT3+MLLT4+MLLT6+MN1+MNX1+MPL+MSH2+MSH6+MSI2+MSN+MTCP1+MUC1+MUTYH+MYB+MYC+MYCL+MYCN+MYD88+MYH11+MYH9+MYO5A+MYOD1+NAB2+NACA+NBN+NCKIPSD+NCOA1+NCOA2+NCOA4+NCOR1+NDRG1+NF1+NF2+NFATC2+NFE2L2+NFIB+NFKB2+NFKBIE+NIN+NKX2-1+NONO+NOTCH1+NOTCH2+NPM1+NR4A3+NRAS+NRG1+NSD1+NT5C2+NTRK1+NTRK3+NUMA1+NUP214+NUP98+NUTM1+NUTM2A+NUTM2B+OLIG2+OMD+P2RY8+PAFAH1B2+PALB2+PAX3+PAX5+PAX7+PAX8+PBRM1+PBX1+PCM1+PCSK7+PDCD1LG2+PDE4DIP+PDGFB+PDGFRA+PDGFRB+PER1+PHF6+PHOX2B+PICALM+PIK3CA+PIK3R1+PIM1+PLAG1+PLCG1+PML+PMS1+PMS2+POLE+POT1+POU2AF1+POU5F1+PPARG+PPFIBP1+PPP2R1A+PPP6C+PRCC+PRDM1+PRDM16+PRF1+PRKAR1A+PRRX1+PSIP1+PTCH1+PTEN+PTPN11+PTPRB+PTPRC+PTPRK+PWWP2A+RABEP1+RAC1+RAD21+RAD51B+RAF1+RALGDS+RANBP17+RANBP2+RAP1GDS1+RARA+RB1+RBM15+RECQL4+REL+RET+RHOA+RHOH+RMI2+RNF213+RNF217-AS1+RNF43+ROS1+RPL10+RPL22+RPL5+RPN1+RSPO2+RSPO3+RUNDC2A+RUNX1+RUNX1T1+SBDS+SDC4+SDHAF2+SDHB+SDHC+SDHD+SEPT5+SEPT6+SEPT9+SET+SETBP1+SETD2+SF3B1+SFPQ+SH2B3+SH3GL1+SLC34A2+SLC45A3+SMAD4+SMARCA4+SMARCB1+SMARCD1+SMARCE1+SMO+SND1+SOCS1+SOX2+SPECC1+SPEN+SPOP+SRGAP3+SRSF2+SRSF3+SS18+SS18L1+SSX1+SSX2+SSX4+STAG2+STAT3+STAT5B+STAT6+STIL+STK11+STRN+SUFU+SUZ12+SYK+TAF15+TAL1+TAL2+TBL1XR1+TBX3+TCEA1+TCF12+TCF3+TCF7L2+TCL1A+TCL6+TERT+TET1+TET2+TFE3+TFEB+TFG+TFPT+TFRC+THRAP3+TLX1+TLX3+TMPRSS2+TNFAIP3+TNFRSF14+TNFRSF17+TOP1+TP53+TPM3+TPM4+TPR+TRA+TRAF7+TRB+TRD+TRIM24+TRIM27+TRIM33+TRIP11+TRRAP+TSC1+TSC2+TSHR+TTL+U2AF1+UBR5+USP6+VHL+VTI1A+WAS+WHSC1+WHSC1L1+WIF1+WRN+WT1+WWTR1+XPA+XPC+XPO1+YWHAE+ZBTB16+ZCCHC8+ZNF198+ZNF278+ZNF331+ZNF384+ZNF521+ZRSR2";

	fetchData(page, queryString);

	function fetchData(page, queryString)
	{
		var next = false;
		var signedIn = false;

		page.onLoadFinished = function(status) {
			if (status != "success")
			{
				// TODO there is something wrong!
				console.log("something went wrong!");
			}

			if (!next)
			{
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
				var data = page.evaluate(function() {
					return document.getElementsByTagName("pre")[0].innerText;
				});

				// TODO parse, format, output the data
				console.log("DATA: " + data.substring(0, 100));
			}
		};

		page.open(baseUrl + "?" + queryString);
	}
}

//main(minimist(process.argv.slice(2)));
main(minimist(system.args.slice(1)));