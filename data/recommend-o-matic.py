#!/usr/bin/env python

# recommend-o-matic tool to validate and parse exports to generate json for
# the Recommend-o-matic web interface. Use reccommend-o-matic --help
# for usage, or see the project README https://github.com/stanford-rc/recommend-o-matic

import argparse
import json
import sys
import os


def get_parser():
    parser = argparse.ArgumentParser(description="Recommend-o-matic")

    description = "actions for Recommend-o-matic"
    subparsers = parser.add_subparsers(
        help="recommend-o-matic actions",
        title="actions",
        description=description,
        dest="command",
    )

    validate = subparsers.add_parser(
        "validate", help="validate tab separated files only"
    )

    generate = subparsers.add_parser(
        "generate", help="validate and generate json for the Recommend-o-matic."
    )

    generate.add_argument(
        "--force",
        "-f",
        dest="force",
        help="force generation if the output files already exist",
        default=False,
        action="store_true",
    )

    for subparser in [validate, generate]:
        subparser.add_argument(
            "--resources",
            "-r",
            dest="resources",
            help="tab separated file with resources",
        )

        subparser.add_argument(
            "--questions",
            "-q",
            dest="questions",
            help="tab separated file with questions",
        )

        subparser.add_argument(
            "--outfile",
            "-o",
            dest="outfile",
            default="resources-and-options.json",
            help="the path to the output file. Defaults to resources-and-options.json",
        )

    return parser


# read/write helper functions


def read_tsv(questions_file, resources_file):
    """ensure that each file exists, and is readable as tab separated values"""
    if not questions_file or not resources_file:
        sys.exit("Both --questions and --resources are required.")

    # Ensure both files exist here
    for path in [questions_file, resources_file]:
        if not os.path.exists(path):
            sys.exit("path %s provided does not exist." % path)

    return {
        "resources": read_file(resources_file),
        "questions": read_file(questions_file),
    }


def read_file(filename, sep="\t"):
    """A helper function to read a file, and separate by the tab delimiter"""
    with open(filename, "r") as fd:
        lines = fd.readlines()
    lines = [x.strip().split(sep) for x in lines]
    return lines


# validation helper functions


def validate(data):
    """Given a set of input files (one for resources, one for questions)
    validate that no provided resource has an unknown question or data
    structure. We exit in case any issue arises, as any single issue
    can break later validation.
    """
    # Ensure that both data files are provided and exist
    validate_not_empty(data)

    # Each row in both must be the same length
    validate_row_length(data)

    # Validate required column names for questions are present
    validate_columns(data)

    # Validate question answers for resources
    validate_question_answers(data)

    # If we made it here, valid!
    print("Validation all tests pass.")


def validate_not_empty(data):
    """Ensure that both files have content. We exit if any of required data is empty.

    Parameters
    ==========
    data (dict) : the dictionary with resources and questions
    """
    # If data is empty, this is an issue
    if not data["resources"] or not data["questions"]:
        sys.exit("You must provide data in both resource and question files.")


def validate_column_names(columns_found, columns_required, resource_type=""):
    """ensure that required columns are present in a data file.
    We currently allow extra columns (e.g., notes) in case they are added.
    We exit if the data is not valid.

    Parameters
    ==========
    columns_found    (list) : a list of column names that exist
    columns_required (list) : a list of column names that are required
    resource_type    (str)  : if applicable, a resource type to tell the user
    """
    for column_name in columns_required:
        if column_name not in columns_found:
            sys.exit("Missing column %s for resource %s" % (column_name, resource_type))


def validate_row_length(data):
    """For each key in the data (resources and questions) ensure that we have
    the right amount of data defined. We exit if the data is not valid.

    Parameters
    ==========
    data (dict) : the dictionary with resources and questions
    """
    for name, entry in data.items():
        row_length = len(entry[0])

        # Case 1, a row length of 1 indicates wrong delimiter
        if row_length == 1:
            sys.exit("Found row length 1 for %s, did you use a tab delimiter?" % name)
        for i, row in enumerate(entry):
            if len(row) != row_length:
                sys.exit(
                    "Row %s in %s should have length %s, found %s: %s"
                    % (i, name, row_length, len(row), row)
                )


def validate_columns(data):
    """Ensure that each row has the same number of columns, and that the
    required names are provided for each. For the resources file, there
    should be a column for each question_ defined in questions.

    Parameters
    ==========
    data (dict) : the dictionary with resources and questions
    """
    validate_column_names(
        data["questions"][0],
        ["unique_id", "question", "options", "include"],
        "questions",
    )

    # The resource column names also need to include question ids
    columns_required = [
        "unique_id",
        "name",
        "category",
        "group",
        "url",
        "description",
        "include",
    ] + [c for c in data["questions"][0] if c.startswith("question_")]
    validate_column_names(data["resources"][0], columns_required, "resources")


def validate_question_answers(data):
    """For each entry in resources, since we allow one or more answers, we must
    ensure that they correspond exactly to valid answers for questions.
    To do this, we generate a lookup for questions, and then iterate through
    resources to check each. If any resource is invalid, the user is notified
    and we exit with the error.

    Parameters
    ==========
    data (dict) : the dictionary with resources and questions
    """
    questions = generate_tsv_lookup(data["questions"])
    resources = generate_tsv_lookup(data["resources"])
    for resource_id, metadata in resources.items():
        for question_id, answers in metadata.items():
            if not question_id.startswith("question_"):
                continue

            # Ensure the question id is defined for questions
            if question_id not in questions:
                sys.exit(
                    "Found question %s defined for resource %s, not defined in questions."
                    % (question_id, resource_id)
                )

            # Valid answers also include blank (indicating no filter to be done)
            valid_answers = questions[question_id]["options"] + [""]
            for answer in metadata[question_id]:
                if answer not in valid_answers:
                    sys.exit(
                        'Answer "%s" for %s:%s is not valid, options are\n %s'
                        % (answer, resource_id, question_id, "\n".join(valid_answers))
                    )


# generate helper functions


def generate(data, outfile, force=False):
    """Generate the output data file, ensuring that if it already exists we don't
    overwrite unless force is provided.
    """
    if os.path.exists(outfile) and not force:
        sys.exit("%s exists, and --force is not set. Will not overwrite." % outfile)

    result = {
        "questions": list(generate_tsv_lookup(data["questions"], True).values()),
        "resources": list(generate_tsv_lookup(data["resources"], True).values()),
    }
    print("Writing questions and answers to %s" % outfile)
    with open(outfile, "w") as fd:
        fd.write(json.dumps(result, indent=4))


def generate_tsv_lookup(rows, included_only=False):
    """Generate a tsv lookup of questions or resources, or a
    dictionary where keys correspond to unique ids for the question or.
    resource. A question entry should have the following:

    {"question_affiliation":
         {'unique_id': 'question_affiliation',
          'question': 'I am affiliated with the following group(s)',
          'options': ['ICME', 'School of Medicine', 'Genetics'],
          'include': 'yes'}}

    And a resources entry will have the following:

    {'resource_uit_stanford_sites': {'unique_id': 'resource_uit_stanford_sites',
     'name': 'Stanford Sites',
     'category': 'website',
     'group': 'UIT',
     'url': 'https://uit.stanford.edu/service/stanfordsites',
     'description': 'Drupal / Wordpress based websites running on managed UIT infrastructure',
     'question_run_what': ['I want to run a website'],
     'question_risk_level': ['low', 'moderate'],
     'question_sysadmin': [''],
     'question_developer': ['yes', 'no'],
     'question_database': [''],
     'question_cost': [''],
     'question_gpus': ['no'],
     'question_affiliation': [''],
     'question_duration': [''],
     'include': 'yes'},

    Parameters
    ==========
    data (dict) : the dictionary with resources and questions
    included_only (str) : don't include items with include set to no
    """
    # Create a question columns lookup
    columns = rows[0]
    lookup = {columns.index(x): x for x in columns}
    entries = {}
    for row in rows[1:]:
        entry = {}
        for idx, key in lookup.items():
            # For comma separated, we want a list
            if key == "options" or key.startswith("question_"):
                entry[key] = [x.strip() for x in row[idx].split(",")]
            else:
                entry[key] = row[idx].strip()

        # Filter to included items
        if included_only and entry.get('include', "yes") == "no":
            continue
        entries[entry["unique_id"]] = entry
    return entries


def main():
    """main is the entrypoint to the recommend-o-matic parser script."""

    parser = get_parser()

    # If the user didn't provide any arguments, show the full help
    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)

    # If an error occurs while parsing the arguments, the interpreter will exit with value 2
    args, extra = parser.parse_known_args()

    # Read in data, flattened into single data structure
    data = read_tsv(questions_file=args.questions, resources_file=args.resources)

    # Validate only, or validate and generate output files
    if args.command == "validate":
        validate(data)
    elif args.command == "generate":
        validate(data)
        generate(data, force=args.force, outfile=args.outfile)


if __name__ == "__main__":
    main()
