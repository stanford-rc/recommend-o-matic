// Define the component
Vue.component('recommend-o-matic', {
  template: `
    <div class="row" style="padding-top:20px">
        <div class="col-md-9">
	<div class="table-responsive">
	<table class="table table-hover">
	  <thead class="thead-light">
            <td></td>
            <td :colspan='colspan' v-for="question in questions">{{ question.question }}</td>
	  </thead>
	  <tbody>
	    <tr v-for="resource in resources" @mouseover="showResourceIndex = resource.unique_id" @mouseout="showResourceIndex = null">
	      <th scope="row" :id="'row-resource-' + resource.unique_id">
		<div class="person-name"><a class="link" :href="resource.url" target="_blank">{{ resource.name }}</a>
                 <div class="description" v-show="showResourceIndex === resource.unique_id" style="font-weight:400">
                  <i style="color:#CCC" class="fas fa-question"></i> {{ resource.description }}
                 </div>
               </div>
	      </th>
	      <td v-for="(items, key, index) in resource" v-if="key.includes('question_')" :colspan='colspan' :class="selected_class + ' text-white cell row-resource-' + resource.unique_id" :id="'cell-question-' + key + '-resource-' + resource.unique_id">
                  <div class="issue-details"><div class="details" v-for="item in items">{{ item }}</div>
                  </div>
              </td>
	    </tr>
	  </tbody>
	</table>
      </div>
        </div>
        <div class="col-md-3">
            <div class="row" v-for="question in questions">  
               <div class="col-md-12">
                <div class="form-group">
                  <label>{{ question.question }}</label>
                  <select class="form-control question" @change="filterOptions" v-bind:id="question.unique_id" required>
                   <option>--</option>
		   <option v-for="option in question.options" v-bind:value="option">{{option}}</option>
                  </select>
                </div>
                </div>
            </div>
            <button @click="resetOptions" class="btn btn-danger" style="margin-top:30px">Reset</button>
        </div>
    </div>`,
  data() {
    data = {
      resources: window._data.data.resources,
      questions: window._data.data.questions,
      selected_class: window._data.selected_class || "bg-success",
      unselected_class: window._data.unselected_class || "bg-secondary",
      lookup: null,                               // question lookup
      colspan: window._data.colspan || 5,          // span for each column
      resource_lookup: null,                      // resource lookup
      showResourceIndex: null,
      choices: Object()
    }

    // Update the user on choices in console
    console.log("       questions: " + data.resources.length)
    console.log("       resources: " + data.questions.length)
    console.log("         colspan: " + data.colspan)
    console.log("           divid: " + data.divid)
    console.log("  selected_class: " + data.selected_class)
    console.log("unselected_class: " + data.unselected_class)
    return data

  },

  // Create a lookup dictionary of questions and resources
  mounted() {
    var lookup = Object()
    var resource_lookup = Object()

    $.each(this.questions, function(i, question) {
      lookup[question.unique_id] = question;
    });
    $.each(this.resources, function(i, resource) {
      resource_lookup[resource.unique_id] = resource;
    });

    this.lookup = lookup;
    this.resource_lookup = resource_lookup;
  },

  methods: {

    // Clear all selections to start over 
    resetOptions: function(event) {
      $.each($(".question option:selected"), function() {
        $(this).prop('selected', false);
      });
      this.choices = Object();
      $(".cell").removeClass(this.unselected_class);
      $(".cell").addClass(this.selected_class);
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

      // Keep a reference to vue data
      data = this

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
            if ((options.length == 1) && (options[0] == "")) {
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
          $(row_class).removeClass(data.unselected_class);
          $(row_class).addClass(data.selected_class);
        } else {
          $(row_class).removeClass(data.selected_class);
          $(row_class).addClass(data.unselected_class);
        }
      });
    }
  }
})


function Recommendomatic(options) {
  // Options accepted include:
  // options.data: must include resources and questions validated/generated from reccomend-o-matic.py
  // options.colspan: numbers of columns to span (defaults to 5)
  // options.divid: divid for the vue (includes <recommend-o-matic></recommend-o-matic> defaults to #app
  // options.selected_class: class to indicate option is available (defaults to bg-success)
  // options.unselected_class: class to indicate option not available (defaults to bg-secondary)
  
  // Hacky method to pass data to component
  window._data = options
  divid = options.divid || "#app"
  console.log(window._data)

  // Instantiate the view, it will use window data
  new Vue({
    el: divid
  })
}
