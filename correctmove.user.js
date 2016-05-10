// ==UserScript==
// @name         CorrectMove
// @namespace    http://andrewshand.github.io/
// @version      0.2.1
// @description  Make it easier to find a property on RightMove
// @author       andrewshand94
// @connect      *
// @include      *://*.rightmove.co.uk/property-to-rent/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      http://code.jquery.com/jquery-latest.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.13.0/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// @updateURL    https://openuserjs.org/meta/andrewshand94/CorrectMove.meta.js
// @downloadURL  https://openuserjs.org/install/andrewshand94/CorrectMove.user.js
// @run-at       document-idle
// ==/UserScript==

/* jshint asi: true, esnext: true, -W097 */

const once = _.once(function($) {

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
        
        // Reset anything we've done to the card
        jcard.parent().css('opacity', 1);
        jcard.find('.betterMove').remove();

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

            const element = `<span class="betterMove">${text}, </span>`;
            card.find('.propertyCard-branchSummary-addedOrReduced').prepend(element);
            
            if (options.hideBeforeDate) {
                card.parent().css('opacity', mo.isBefore("2016-06-25") ? '0.1' : '1');
            }
        };

        const existing = GM_getValue("homer-" + id);
        if (typeof(existing) === 'number') {
            addToCard(jcard, existing);
            return;
        }

        setTimeout(function() {

            $.get(link, function(data, request) {

                function findDateAsMoment() {
                    
                    const html = $(data);
                    
                    // First try get from the default place
                    const potentialDate = html.find('#lettingInformation tr').map((index, row) => {
                        if ($(row).text().indexOf('available') >= 0) {

                            const dateText = $(row).children()[1].innerText.trim();

                            let time;
                            if (dateText.toLowerCase() == 'now') {
                                time = moment();
                            }
                            else {
                                time = moment(dateText, "DD/MM/YYYY");
                            }

                            return time;
                        }
                    }).filter(el => typeof(el) !== 'undefined').toArray().shift();
                    
                    if (moment.isMoment(potentialDate)) {
                        return potentialDate;
                    }                  
                    
                    const regex = /([0-9][0-9]?(th|rd|st|nd)*) (may|june|july|sep|sept|september|oct|october|nov|november|dec|december|jan|january)/;
                    const searchText = html.find('.agent-content :not(#lettingInformation).sect').text().toLowerCase()
                    const textDate = searchText.match(regex).shift();
                    
                    if (typeof(textDate) === 'string') {
                        function isValid(mmnt) {
                            return !isNaN(mmnt.toDate().getTime());
                        }
                        
                        let date = moment(textDate.trim());
                        if (isValid(date)) {
                            return date;
                        }   
                        
                        date = moment(textDate.trim(), 'Do MMMM');
                        if (isValid(date)) {
                            return date;
                        }
                        
                        date = moment(textDate.trim(), 'D MMMM');
                        if (isValid(date)) {
                            return date;
                        }
                    }
                    
                    const availableNow = searchText.indexOf('available now') >= 0;
                    if (availableNow === true) {
                        return moment();
                    }
                }
                
                const time = findDateAsMoment();
                if (moment.isMoment(time)) {
                    GM_setValue("homer-" + id, time.unix() * 1000);
                    addToCard(jcard, time.unix() * 1000);
                }                
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
jQuery(document).ready(once);