// ==UserScript==
// @name         Better Filters for GitHub
// @namespace    http://joelwalters.com/
// @version      1.0.5
// @description  Provides filters for GitHub Projects.
// @author       Joel Walters
// @match        https://github.com/*
// @grant        GM_addStyle
// @require      http://code.jquery.com/jquery-3.2.1.slim.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// ==/UserScript==

(function ($) {
  var projects = function () {
    'use strict';
    // jshint multistr:true

    var $project = $('.project-columns');
    var $filterLabel = $('<select class="ght-filter form-select select-sm"><option value="">- Filter by Label -</option></select>');
    var $filterAssignee = $('<select class="ght-filter form-select select-sm"><option value="">- Filter by Assignee -</option></select>');
    var $filterClear = $('<a href="#" class="btn btn-sm"><svg class="octicon octicon-x" viewBox="0 0 12 16" version="1.1" width="12" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48z"></path></svg> clear filters</a>');
    var $toggleLabels = $('<div><label><input type="checkbox" id="ghtToggleLabels" name="ghtToggleLabels"> Show Labels</label></div>');
    var $infoTooltip = $('<div class="ght-item left pt-1"><span class="tooltipped tooltipped-e" aria-label="Filters provided by Better Filters for Github (click for more)"><a href="https://github.com/tableau-mkt/better-filters-for-github" class="link-gray-dark" target="_blank"><svg class="octicon octicon-info" viewBox="0 0 14 16" version="1.1" width="14" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"></path></svg></a></span></div>');
    var $controls = $('<div class="ght-controls clearfix pt-3"></div>');
    var counts = {};
    var values = {};
    var cardCount;
    var prevCardCount;
    var intervalTimeout;
    var checkCount = 0;
    var options = JSON.parse(localStorage.getItem('ghtOptions')) || {};
    _.defaults(options, {
      showLabels: false,
      label: '',
      assignee: ''
    });

    function setInputsFromOptions() {
      $filterLabel.val(options.label);
      $filterAssignee.val(options.assignee);
      $toggleLabels.find('input').prop('checked', options.showLabels);
    }

    function saveOptions() {
      localStorage.setItem('ghtOptions', JSON.stringify(options));
    }

    function applyAndSaveOptions() {
      var filters = {};
      $project.find('.labels').toggleClass('ght-hidden', !options.showLabels);
      $project.find('.issue-card').each(function () {
        var showAllLabels = options.label === '',
          showAllAssignees = options.assignee === '';

        filters.label = showAllLabels || $(this).find('.issue-card-label').filter(function () {
            return this.innerText === options.label;
          }).length > 0;
        filters.assignee = showAllAssignees || $(this).find('.avatar-stack .avatar').filter(function () {
            return this.alt === options.assignee;
          }).length > 0;
        $(this).toggleClass('ght-hidden', !_.every(filters, function (isMatch) {
          return isMatch;
        }));
      });
      saveOptions();
    }

    GM_addStyle('.ght-item { margin: .5em; }');
    GM_addStyle('.ght-hidden { display: none !important; }');

    $(document).on('submit', function () {
      setTimeout(applyAndSaveOptions, 1000);
    });

    $filterClear.on('click', function () {
      $filterLabel.val('');
      options.labels = '';
      $filterAssignee.val('');
      options.assignee = '';
      applyAndSaveOptions();
      return false;
    });

    $toggleLabels.find('input').on('change', function () {
      options.showLabels = this.checked;
      applyAndSaveOptions();
    });

    $filterAssignee.on('change', function () {
      options.assignee = this.value;
      applyAndSaveOptions();
    });

    $filterLabel.on('change', function () {
      options.label = this.value;
      applyAndSaveOptions();
    });

    // Check for async loaded cards.
    intervalTimeout = setInterval(function checkLabels() {
      cardCount = $project.find('.issue-card').length;
      checkCount++;
      if (checkCount > 5) {
        clearInterval(intervalTimeout);
      }

      // Get all assignees.
      values.assignees = $project.find('.avatar-stack .avatar').map(function () {
        return this.alt;
      });
      // Create a lookup  for count
      counts.assignees = _.countBy(values.assignees);
      values.assignees = _.uniq(values.assignees.sort());

      // Get all labels.
      values.labels = $project.find('.issue-card-label').map(function () {
        return this.innerText;
      });
      // Create a lookup table for count (occurrences).
      counts.labels = _.countBy(values.labels);
      values.labels = _.uniq(values.labels.sort());

      // Count changed, update the values.
      if (cardCount !== prevCardCount) {
        $filterLabel.find('option').slice(1).remove();
        _.each(values.labels, function (label) {
          $filterLabel.append('<option value="' + label + '">' + label + ' (' + counts.labels[label] + ')</option>');
        });
        $filterAssignee.find('option').slice(1).remove();
        _.each(values.assignees, function (assignee) {
          $filterAssignee.append('<option value="' + assignee + '">' + assignee + ' (' + counts.assignees[assignee] + ')</option>');
        });
        setInputsFromOptions();
        applyAndSaveOptions();

        // Highlight "Blocked/Waiting" issues with a light pink/red background.
        $project.find('[aria-label~="status-blocked_waiting"]').closest('.issue-card').removeClass('bg-white').css('background-color', '#fee');
      }
      prevCardCount = cardCount;
    }, 1000);

    $controls
    .append($filterLabel)
    .append($filterAssignee)
    .append($filterClear)
    .append($infoTooltip)
    .append($toggleLabels);

    $controls.find('> *').wrap('<div class="ght-item left">').last().parent().addClass('right').removeClass('left');

    $('.project-columns').before($controls);
  };

  if ($('.project-columns').length) {
    console.log('[GitHub Tweaks]', 'Activated projects tweaks');
    projects();
  }
})(jQuery);
