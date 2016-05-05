// ==UserScript==
// @name         CorrectMove
// @namespace    http://andrewshand.github.io/
// @version      0.2
// @description  try to take over the world!
// @author       You
// @connect      *
// @match        *://*.rightmove.co.uk/property-to-rent/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      http://code.jquery.com/jquery-latest.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.13.0/moment.min.js
// @require      https://cdn.rawgit.com/meetselva/attrchange/master/js/attrchange.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// @include      *
// @updateURL https://openuserjs.org/meta/andrewshand94/CorrectMove.meta.js
// @downloadURL https://openuserjs.org/meta/andrewshand94/CorrectMove.user.js
// ==/UserScript==

/* jshint asi: true, esnext: true, -W097 */

jQuery(document).ready(function($) {

    const options = {
        clearCache: false,
        hideBeforeDate: true
    };

    if (options.clearCache) {
        GM_listValues().forEach(value => {
            GM_deleteValue(value);
        });
    }

    function doCard(card, i) {

        const jcard = $(card);
        const link = window.location.origin + jcard.find('.propertyCard-link').attr('href');
        const idContainer = jcard.find('.propertyCard-anchor');
        const id = idContainer.attr('id');

        function addToCard(card, time) {

            card.data('available', time);
            const date = new Date(time);

            const mo = moment(time);
            let text;

            if (mo.isSame(moment(), 'day')) {
                text = 'Available now';
            }
            else {
                text = 'Available from ' + moment(date).format("Do MMM");
            }

            card.find('.propertyCard-branchSummary-addedOrReduced').prepend(`${text}, `);
            
            if (options.hideBeforeDate) {
                card.parent().css('display', mo.isBefore("2016-06-25") ? 'none' : '');
            }
        };

        const existing = GM_getValue("homer-" + id);
        if (typeof(existing) === 'number') {
            addToCard(jcard, existing);
            return;
        }

        setTimeout(function() {

            $.get(link, function(data, request) {

                $(data).find('#lettingInformation tr').each((index, row) => {
                    if ($(row).text().indexOf('available') >= 0) {

                        const dateText = $(row).children()[1].innerText.trim();

                        let time;
                        if (dateText.toLowerCase() == 'now') {
                            time = moment();
                        }
                        else {
                            time = moment(dateText, "DD/MM/YYYY");
                        }

                        GM_setValue("homer-" + id, time.unix() * 1000);
                        addToCard(jcard, time.unix() * 1000);
                    }
                });
            });

        }, (1000 * i) + (2500 * Math.random()));
    }

    function killAds() {
        $('.js-searchResult-creative').css('display', 'none');
    }

    function doCards() {
        $('.propertyCard').each((i, card) => {
            doCard(card, i);
        });
        killAds();
    }    

    $('.pagination-button').click(function() {
        setTimeout(doCards, 1000);
    });

    doCards();
});