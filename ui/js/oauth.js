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

require(['jquery','oae.core'], function($, oae) {

    if (oae.data.me.anon) {
        return oae.api.util.redirect().accessdenied();
    }

    // Set the page title
    oae.api.util.setBrowserTitle('__MSG__WELCOME__');

    /**
     * Set up the main search form. When the form is submitted, the user will be
     * redirected to the search page using the entered search query
     */
    var setUpSearch = function() {
        $(document).on('submit', '#index-search-form', function() {
            var query = $.trim($('#index-search-query', $(this)).val());
            window.location = '/search/' + oae.api.util.security().encodeForURL(query);
            return false;
        });
    };

    var setupOAuthForm = function() {

        var clientId = $.url().param().client_id;
        var redirectUri = $.url().param().redirect_uri;

        $.ajax({
            'type': 'GET',
            'url': '/api/auth/oauth/v2/authorize',
            'data': {
                'client_id': clientId,
                'redirect_uri': redirectUri,
                'response_type': 'code'
            },
            'success': function(data) {
                data['redirect_uri'] = redirectUri
                oae.api.util.template().render($('#oauth-template'), data, $('#oauth-container')); 
            }
        });
    };

    setUpSearch();
    setupOAuthForm();
});
