/*!
 * Copyright 2014 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

require(['jquery', 'oae.core', 'underscore'], function($, oae, _) {

    /**
     * Initializes the Activity Reference UI
     */
    var doInit = function() {
        $.ajax({
            'type': 'get',
            'url': '/api/activity/info',
            'success': function(data) {

                // Massage the data a little bit so the templates can rendered more easily
                _.each(data.types, function(activityType) {
                    if (activityType.groupBy) {
                        activityType.groupBy = _.map(activityType.groupBy, function(grouping) {
                            var arr = [];
                            _.each(grouping, function(b, entityType) {
                                arr.push(entityType);
                            });
                            return arr;
                        });
                    }
                    if (activityType.description && activityType.description.entities) {
                        _.each(activityType.description.entities, function(entityTypes, entityProperty) {
                            if (_.isArray(entityTypes)) {
                                activityType.description.entities[entityProperty] = entityTypes.join(', ');
                            }
                        });
                    }
                });

                oae.api.util.template().render($('#registered-entities-template'), {'data': data}, $('#registered-entities'));
                oae.api.util.template().render($('#registered-associations-template'), {'data': data}, $('#registered-associations'));
                oae.api.util.template().render($('#registered-activities-template'), {'data': data}, $('#registered-activities'));
            }
        });
    };

    doInit();
});
