/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

// load the master sakai object to access all Sakai OAE API methods
require(['jquery', 'sakai/sakai.api.core'], function($, sakai) {

    /**
     * @name sakai_global.vivovisualizer
     *
     * @class vivovisualizer
     *
     * @description
     * My Hello World is a dashboard widget that says hello to the current user
     * with text in the color of their choosing
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.vivovisualizer = function(tuid, showSettings) {


        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        var DEFAULT_VISUALIZATIONS = ["coauthornetwork"];  // default visualization is the coauthornetwork.

        // DOM jQuery Objects
        var $rootel = $('#' + tuid);  // unique container for each widget instance
        var $mainContainer = $('#vivovisualizer_main', $rootel);
        var $settingsContainer = $('#vivovisualizer_settings', $rootel);
        var $settingsForm = $('#vivovisualizer_settings_form', $rootel);
        var $cancelSettings = $('#vivovisualizer_cancel_settings', $rootel);
        // Visualizations
        var $coauthornetworkvis = $('#vivovisualizer_visualization_coauthornetwork_vis', $rootel);
        var $coinvestigatornetworkvis = $('#vivovisualizer_visualization_coinvestigator_vis', $rootel);
        var flashvars = {
            'coauthornetwork': 'graphmlUrl=http://vivo.example.com/vivo/visualizationData?uri=${uri}%26vis=coauthorship&amp;labelField=label&amp;visType=CoAuthor',
            'coinvestigatornetwork': 'graphmlUrl=http://vivo.example.com/vivo/visualizationData?uri=${uri}%26vis=coprincipalinvestigator&amp;labelField=label&amp;visType=CoPI',
        };


        ///////////////////////
        // Utility functions //
        ///////////////////////

        /**
         * Gets the visualizations from the server using an asynchronous request
         *
         * @param {Object} callback Function to call when the request returns. This
         * function will be sent an Array with the visualizations that should be displayed.
         */
        var getPreferredVisualizations = function(callback) {                                                                       
            // get the data associated with this widget
            sakai.api.Widgets.loadWidgetData(tuid, function(success, data) {
                if (success) {
                    // fetching the data succeeded, send it to the callback function
                    if (data.visualizations) {
                        var visualizations = data.visualizations.split(";");
                        callback(visualizations);
                    } else {
                        callback(DEFAULT_VISUALIZATIONS);
                    }
                } else {
                    // fetching the data failed, we use the DEFAULT_VISUALIZATIONS
                    callback(DEFAULT_VISUALIZATIONS);
                }
            });
        };


        /**
         * @param {String} userid
         * @param {Function} callback
         */
        var getVivoData = function(userid, callback) {
            $.ajax({
                url: '/system/vivo?userid=' + userid,
                cache: false,
                dataType: "json",
                success: function(data) {
                    if ($.isFunction(callback)) {
                        callback(true, data);
                    }
                },
                error: function(xhr, status, e) {
                    if ($.isFunction(callback)) {
                        callback(false, data);
                    }
                }
            });
        };

        /////////////////////////
        // Main View functions //
        /////////////////////////

        /**
         * Shows the Main view that contains all the visualizations
         *
         * @param {Array} visualizations An array of strings that holds which visualizations should be displayed.
         * (i.e. '#00FF00')
         */
        var showMainView = function(visualizations) {

            getVivoData(sakai.data.me.user.userid, function(success, data) {
                $coauthornetworkvis.attr('flashvars', flashvars['coauthornetwork'].replace('${uri}', encodeURIComponent(data.basic.uri)));
                $coinvestigatornetworkvis.attr('flashvars', flashvars['coinvestigatornetwork'].replace('${uri}', encodeURIComponent(data.basic.uri)));

                // Show the visualizations we want to see.
                for (var i=0, j=visualizations.length;i<j;i++) {
                    $("#vivovisualizer_visualization_" + visualizations[i], $mainContainer).show();
                }

                // show the Main container
                $mainContainer.show();
            });
        };


        /////////////////////////////
        // Settings View functions //
        /////////////////////////////

        /**
         * Checks the selected visualizations on the input boxes
         *
         * @param {Array} visualizations The selected visualizations
         */
        var setSelectedVisualizations = function(visualizations) {
            // set the color dropdown to the given value
            for (var i =0,j=visualizations.length;i < j;i++) {
                $("#vivovisualizer_settings_" + visualizations[i], $settingsContainer).attr('checked', true);
            }
        };


        ////////////////////
        // Event Handlers //
        ////////////////////

        /** Binds Settings form */
        $settingsForm.on('submit', function(ev) {
            // get the selected visualizations
            var visualizations = [];
            $("fieldset#vivovisualizer_settings_visualizations input:checked", $settingsContainer).each(function(i, e) { 
                visualizations.push(e.id.substr(24));
            });

            // save the selected color
            sakai.api.Widgets.saveWidgetData(tuid, {
                'visualizations': visualizations.join(";")
                },
                function(success, data) {
                    if (success) {
                        // Settings finished, switch to Main view
                        sakai.api.Widgets.Container.informFinish(tuid, 'vivovisualizer');
                    }
                }
            );
            return false;
        });

        $cancelSettings.on('click', function(){
            sakai.api.Widgets.Container.informFinish(tuid, 'vivovisualizer');
        });


        /////////////////////////////
        // Initialization function //
        /////////////////////////////

        /**
         * Initialization function that is run when the widget is loaded. Determines
         * which mode the widget is in (settings or main), loads the necessary data
         * and shows the correct view.
         */
        var doInit = function() {
            if (showSettings) {
                // set up Settings view

                // get the preferred visualizations & set the checkboxes
                getPreferredVisualizations(setSelectedVisualizations);

                // show the Settings view
                $settingsContainer.show();
            } else {
                // get the preferred visualizations and show the Main view
                getPreferredVisualizations(showMainView);
            }
        };

        // run the initialization function when the widget object loads
        doInit();
    };

    // inform Sakai OAE that this widget has loaded and is ready to run
    sakai.api.Widgets.widgetLoader.informOnLoad('vivovisualizer');
});
