# Recommend-o-matic

The recommend-o-matic is a web interface that makes it easy to display
a list of options alongside filters, with the ultimate goal being to help
a user make a choice. It is developed generically to be useful for multiple
cases, such as:

 - Compute
 - Storage

## 1. Generating Data

To make it easy to collaborate on sets of questions and resources, we encourage
a workflow that has collaborative editing done in Google Sheets, and then
export of those sheets to a tab separated file. As an example, you might want the
following two sheets:

### Sheets Required

An exported example (tab separated, tsv) of questions and answers is provided in this
repository under [data](data).

#### Questions

This might be a branded or grouped listing (e.g., for a particular group or type of service)
of questions that a user can select to filter resources. For each question, 
you should provide a unique id (unique_id), question text (question), and set of options (options) 
separated by commas. The included column is a flag to indicate if a question should be included or not.
Blank indicates there is no information, in which case no filtering is done on that field.

#### Resources
This sheet should include listing of resources matched (via unique_id) to the questions. For each question, you should include every option that is supported by the resource. For example, if a compute resource has database support, you would indicate both yes and no (no, yes) under that question to ensure that the resource remains available regardless of what the user selects.

#### Instructions

The following instructions are for how to create the sheets! You can look at the *.tsv examples in
[data](data), and the following points can be useful to answer any additional questions you might have.
If you have a question not addressed here, please [open an issue](https://github.com/stanford-rc/recommend-o-matic/issues)

1. Add questions about your resources to the ComputeQuesitons tab. For each question, the unique_id will be used in the ComputeResources tab to reference the question
2. Each question should have a comma separated list of possible options. This list will be validated when the data is parsed.
3. In the ComputeResources tab, include the name, category, group (e.g., SRCC, TCG), url, and description for a resource.
4. The next set of columns in the ComputeResources tab should correspond with the question unique_id s, and within each box one or more answers provided.
5. You should provide all answers, comma separated as well, that you want the resource to remain available if the user selects.
6. In the case that the question is not relevant to the resource, or if selection of any option is irrelevant, leave the box blank. This means that changing the selection will not impact the display of the resource.

### 2. Interface Data Generation

For running any recommend-o-matic interface, we need to validate the data first, 
and then only once validated, parse it into a data structure that easily feeds into 
the interface (if you are familiar, a JSON file). A simple Python script is provided here to do that, and it has no additional dependencies so should work with Python version 3+.

#### Validate and Generate
Here is how we would provide the questions and resources to the script, all located under
[data](data):

```bash
$ python data/recommend-o-matic.py generate --questions data/ComputeQuestions.tsv --resources data/ComputeResources.tsv 
Validation all tests pass.
Writing questions and answers to resources-and-options.json
```

If any field or mapping in either file is not valid, you'll get a message printed to the screen:

```
Answer "I want to run a web service" for resource_som_medirt:question_run_what is not valid, options are
 I want to run a website
I want to run a database
I want to run a webservice
I want to perform research/ML
I want to use interactive notebooks
I need help creating a tool or interface
```
And you can fix the file (it's recommended to fix also in your Google Sheet, if you
are using Google sheets) and run the script again.

#### Force

If the file already exists, you'll be notified:

```bash
$ python data/recommend-o-matic.py generate --questions data/ComputeQuestions.tsv --resources data/ComputeResources.tsv 
Validation all tests pass.
resources-and-options.json exists, and --force is not set. Will not overwrite.
```

If you want to force over-write, you can either delete the file or provide `--force`

```bash
$ python data/recommend-o-matic.py generate --questions data/ComputeQuestions.tsv --resources data/ComputeResources.tsv  --force
Validation all tests pass.
Writing questions and answers to resources-and-options.json
```

#### Output File
By default, the output file (a json data structure for the interface) will be named resources-and-options.json in the present working directory, however you can edit that as follows:

```bash
$ python data/recommend-o-matic.py generate --questions data/ComputeQuestions.tsv --resources data/ComputeResources.tsv --outfile data/another-name.json
```

#### Validate Only

If you want to validate only, you can do that too:

```bash
$ python data/recommend-o-matic.py validate --questions data/ComputeQuestions.tsv --resources data/ComputeResources.tsv  
Validation all tests pass.
```

## 2. Creating Interface

**under development**
