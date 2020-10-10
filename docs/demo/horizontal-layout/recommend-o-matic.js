function Recommendomatic(data) {

    new Vue({
      el: "#app",
      data: {
        resources: data.resources,
        questions: data.questions,
        lookup: null, // question lookup
        rows: null, // rows of questions
        rowsize: data.rowsize | 4, // 4 questions per row == column class col-md-3
        resource_lookup: null, // resource lookup
        showResourceIndex: null,
        choices: Object()
      },

      // Create a lookup dictionary of questions and resources
      mounted() {
        var lookup = Object()
        var resource_lookup = Object()
        var rows = [];

        $.each(this.questions, function(i, question) {
          lookup[question.unique_id] = question;
        });
        $.each(this.resources, function(i, resource) {
          resource_lookup[resource.unique_id] = resource;
        });

        // Split questions into rows
        for (var i=0; i<this.questions.length; i+=this.rowsize) {
             rows.push(this.questions.slice(i,i+this.rowsize));
        }
        this.rows = rows
        this.lookup = lookup;
        this.resource_lookup = resource_lookup;
      },

      methods: {

        // Helper functions
        getRandomColor: function() {
          var letters = '0123456789ABCDEF';
          var color = '#';
          for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
          }
          return color;
        },

        // Clear all selections to start over 
        resetOptions: function(event) {
          $.each($(".question option:selected"), function() {
            $(this).prop('selected', false);
          });
          this.choices = Object();
          $(".cell").removeClass("bg-secondary");
          $(".cell").addClass("bg-success");
        },

        filterOptions: function(event) {
          var question_id = event.target.id;

          // Prepare for multiple select (put into list)
          var choices = Array($('#' + question_id).val());

          // Update choices
          this.choices[question_id] = choices;
          this.calculateChoices(this.choices, this.lookup);

        },

        // Based on content in this.choices, adjust resources shown
        calculateChoices: function(choices, lookup) {

          // loop through resources, and assess choices for each 
          $.each(this.resources, function(i, resource) {

            // select resource on the highest level, eliminated if anything doesn't fit
            var selected = true;

            // loop through current question choices
            $.each(choices, function(question_id, values) {

              // default for a question/resource pair (a cell) is selected (leave showing)
              var question = lookup[question_id];

              // Only assess if the key is defined as an attribute
              if (question.unique_id in resource) {

                  // Valid options for the resource
                  var options = resource[question.unique_id]

                  // Special case, if options is length 1 and empty, doesn't change anything
                  if ((options.length == 1) && (options[0] == "")){
                      console.log("Resource " + resource.name + " is agnostic about question " + question.unique_id)
                  } else {

                      // We currently don't have question types, but if we do, can add logic here
                      // If any attribute is not in list, don't show it
                      $.each(values, function(ii, value) {

                        // Special case, unsure means "I'll accept all, leave as current value
                        if ((value == "not sure") || (value == "--")) {
                            console.log("Not sure for resouce:" + resource.unique_id + " and question: " + question.unique_id + " or -- does not change current decision.")
                        }

                        // Otherwise, if the value is included in options, it is also selected
                        else if ($.inArray(value, options) == -1) {
                          console.log(value + ' is not in ' + options);
                          selected = false;
                        }
                      });
                  }
              }
            });

            console.log("Resource " + resource.name + " selected is " + selected);

            // Change color of cell depending on selection (we can change to color cell or entire row)
            //var cell_id = "#cell-question-" + question_id + "-resource-" + resource.unique_id
            var row_class = ".row-resource-" + resource.unique_id

            if (selected == true) { 
                $(row_class).removeClass("bg-secondary");
                $(row_class).addClass("bg-success");
            } else {
                $(row_class).removeClass("bg-success");
                $(row_class).addClass("bg-secondary");
            }
          });
        }
      }
    })
}
