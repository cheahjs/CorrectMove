// ==UserScript==
// @name         CorrectMove
// @namespace    http://andrewshand.github.io/
// @version      0.3
// @description  Adds availability to search results on RightMove. Also adds per month pricing to per-week listings.
// @author       andrewshand94, jscheah
// @connect      *
// @include      *://*.rightmove.co.uk/property-to-rent/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      http://code.jquery.com/jquery-latest.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.13.0/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// @updateURL    https://openuserjs.org/meta/jscheah/CorrectMove.meta.js
// @downloadURL  https://openuserjs.org/install/jscheah/CorrectMove.user.js
// @run-at       document-idle
// ==/UserScript==
/* jshint asi: true, esnext: true, -W097 */

const once = _.once(function($) {

    function dateIn(amountAndUnit) {
        const splitted = amountAndUnit.split(' ');
        return moment().add(parseInt(splitted[0]), splitted[1]).toDate();
    }

    const options = {
        clearCache: false,
        hideBeforeDate: "2016-06-25",
        hideAfterDate: "2018-09-05"
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
            jcard.parent().css('opacity', 1);
            card.find('.betterMove').remove();
            card.data('available', time);
            const date = new Date(time);

            const mo = moment(time);
            let text;

            if (mo.isSame(moment(), 'day')) {
                text = 'Available now';
            } else {
                text = 'Available from ' + moment(date).format("Do MMM");
            }

            const element = `<span class="betterMove">${text}<br></span>`;
            card.find('.propertyCard-branchSummary-addedOrReduced').prepend(element);

            let hide = false;
            if (options.hideBeforeDate && mo.isBefore(options.hideBeforeDate)) {
                hide = true;
            } else if (options.hideAfterDate && mo.isAfter(options.hideAfterDate)) {
                hide = true;
            }
            card.parent().css('opacity', hide ? '0.1' : '1');
        };

        function addPostcodeToCard(card, postcode) {
            card.find('.betterMovePC').remove();
            const element = `<span class="betterMovePC">, ${postcode}</span>`
            card.find('.propertyCard-address > span').append(element);
        };

        const existing = GM_getValue("homer-" + id);
        const existingpostcode = GM_getValue("postcode" + id);
        var cached = false;
        if (typeof(existing) === 'number') {
            addToCard(jcard, existing);
            cached = true;
        }
        if (existingpostcode !== undefined) {
            addPostcodeToCard(jcard, existingpostcode);
            cached = true;
        }

        setTimeout(function() {
            $.get(link, function(data, request) {
                function findDateAsMoment(html) {
                    // First try get from the default place
                    const potentialDate = html.find('#lettingInformation tr').map((index, row) => {
                        if ($(row).text().indexOf('available') >= 0) {
                            const dateText = $(row).children()[1].innerText.trim();
                            let time;
                            if (dateText.toLowerCase() == 'now') {
                                time = moment();
                            } else {
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

                const html = $(data);


                try {
                    const time = findDateAsMoment(html);
                    if (moment.isMoment(time)) {
                        GM_setValue("homer-" + id, time.unix() * 1000);
                        addToCard(jcard, time.unix() * 1000);
                    }
                } catch (err) {}
                try {
                    const postcode = findPostCode(html);
                    if (postcode != null) {
                        GM_setValue("postcode-" + id, postcode);
                        addPostcodeToCard(jcard, postcode);
                    }
                } catch (err) {}
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

    function rentWeekToMonth() {
        $('#propertyHeaderPrice > strong').each((i, priceHeader) => {
            const rawPrice = priceHeader.innerText.trim();
            if (rawPrice.indexOf('pw') == -1)
                return;
            const regex = /£(\d+) pw/;
            const pricePerWeek = rawPrice.match(regex)[1];
            const pricePerMonth = (pricePerWeek * 52) / 12;
            priceHeader.append('£' + Math.round(pricePerMonth) + ' pm');
        });
    }

    function findPostCode(html) {
        const maybePropertyJson = html.find('script')
            .map((i, d) => d.innerHTML.trim())
            .filter((i, x) => x.indexOf("('property',{\"location\":{") != -1);
        if (maybePropertyJson.length < 1)
            return null;

        const dataRegex = /'property',({.+})\)\);/;
        const data = JSON.parse(maybePropertyJson[0].match(dataRegex)[1]);
        return data.location.postcode;
    }

    function pagePostcode() {
        const postcode = findPostCode($('html'));
        if (postcode == null)
            return;
        $('address').append(`<br>${postcode}`);
    }

    doCards();
    rentWeekToMonth();
    pagePostcode();
});
jQuery(document).ready(once);
