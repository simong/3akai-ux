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
require(
    [
    'jquery', 
    'sakai/sakai.api.core',
    //'http://localhost:7000/vivo/js/individual/individualUtils.js',
    //'https://www.google.com/uds/api/visualization/1.0/a80213ca52ee8e6039f99cb674b35b2f/format+en,default,imagechart,imagesparkline.I.js',
    //'https://www.google.com/jsapi?autoload=%7B%22modules%22%3A%5B%7B%22name%22%3A%22visualization%22%2C%22version%22%3A%221%22%2C%22packages%22%3A%5B%22imagesparkline%22%5D%7D%5D%7D',
    //'http://localhost:7000/vivo/js/visualization/sparkline.js',
    //'http://localhost:7000/vivo/js/visualization/visualization-helper-functions.js'

    ], function($, sakai) {

    /**
     * @name sakai_global.vivoprofile
     *
     * @class vivoprofile
     *
     * @description
     * My Hello World is a dashboard widget that says hello to the current user
     * with text in the color of their choosing
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.vivoprofile = function(tuid, showSettings) {


        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        var DEFAULT_COLOR = '#000000';  // default text color is black

        // DOM jQuery Objects
        var $rootel = $('#' + tuid);  // unique container for each widget instance
        var $mainContainer = $('#vivoprofile_main', $rootel);
        var $settingsContainer = $('#vivoprofile_settings', $rootel);
        var $settingsForm = $('#vivoprofile_settings_form', $rootel);
        var $cancelSettings = $('#vivoprofile_cancel_settings', $rootel);
        var $colorPicker = $('#vivoprofile_color', $rootel);
        var $usernameContainer = $('#vivoprofile_username', $rootel);


        ///////////////////////
        // Utility functions //
        ///////////////////////

        /**
         *
         */
        var getData = function(userid, callback) {
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
         * Shows the Main view that contains the Hello World text colored in the
         * provided color argument
         *
         * @param {String} color The hex value of the color to set the text
         * (i.e. '#00FF00')
         */
        var showMainView = function(userid) {
            
            getData(userid, function(success, data) {
                if (success) {
                    // Massage the data a bit.
                    if (data.publications && data.publications.selected_publications) {
                        data.publications.selected_publications = data.publications.selected_publications.sort(function(a, b) {
                            var propA = a.title.toLowerCase(), 
                                propB = b.title.toLowerCase();
                             if (propA < propB)
                              return -1;
                             if (propA > propB)
                              return 1;
                             return 0;
                        });
                    }
                    data.affiliation =  data.affiliation || false;

                    // Render the template.
                    var html = sakai.api.Util.TemplateRenderer("vivoprofile_template", data);
                    $("#vivoprofile_body").html(html);

/*
                    $.ajax({
                        'url': 'var/proxy/vivo/visualization',
                        'data': {
                            'uri': data.basic.uri,
                            'render_mode': 'dynamic',
                            'vis': 'person_pub_count',
                            'vis_mode': 'short',
                            'container': 'vis_container_coauthor'
                        },
                        'success': function(data) {
                            // Get the javascript code.
                            var s = data.indexOf("<script");
                            var s_e = data.indexOf(">", s);
                            var e = data.indexOf("</script", s);
                            var e_e = data.indexOf(">", e);
                            
                            // Add to scripts array
                            var code = data.substring(s_e+1, e);

                            //console.log("yay\n" + data);
                            //$("#vivo_profile_visualization").html(data);
                            eval(code);
                        },
                        'error': function(data) {
                            console.log('boo');
                        }
                    });
*/

                    // show the Main container
                    $mainContainer.show();
                }
            });
        };


        /////////////////////////////
        // Settings View functions //
        /////////////////////////////

        /**
         * Sets the color dropdown in the Settings view to the given color
         *
         * @param {String} color The hex value of the color
         */
        var setDropdownColor = function(color) {
            // set the color dropdown to the given value
            $colorPicker.val(checkColorArgument(color));
        };


        ////////////////////
        // Event Handlers //
        ////////////////////

        /** Binds Settings form */
        $settingsForm.on('submit', function(ev) {
            // get the selected color
            var selectedColor = $colorPicker.val();

            // save the selected color
            sakai.api.Widgets.saveWidgetData(tuid, {
                'color': selectedColor
                },
                function(success, data) {
                    if (success) {
                        // Settings finished, switch to Main view
                        sakai.api.Widgets.Container.informFinish(tuid, 'vivoprofile');
                    }
                }
            );
            return false;
        });

        $cancelSettings.on('click', function(){
            sakai.api.Widgets.Container.informFinish(tuid, 'vivoprofile');
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

                // get the preferred color & set the color picker dropdown
                getPreferredColor(setDropdownColor);

                // show the Settings view
                $settingsContainer.show();
            } else {
                // set up Main view
                showMainView(sakai.data.me.user.userid)
            }
        };

        // run the initialization function when the widget object loads
        doInit();
    };

    // inform Sakai OAE that this widget has loaded and is ready to run
    sakai.api.Widgets.widgetLoader.informOnLoad('vivoprofile');
});
