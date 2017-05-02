jQuery.fn.highlight = function (pat) {
    function innerHighlight(node, pat) {
        var skip = 0;
        if (node.nodeType == 3) {
            var pos = node.data.toUpperCase().indexOf(pat);
            pos -= (node.data.substr(0, pos).toUpperCase().length - node.data.substr(0, pos).length);
            if (pos >= 0) {
                var spannode = document.createElement('span');
                spannode.className = 'word__hglght--ylw';
                var middlebit = node.splitText(pos);
                var endbit = middlebit.splitText(pat.length);
                var middleclone = middlebit.cloneNode(true);
                spannode.appendChild(middleclone);
                middlebit.parentNode.replaceChild(spannode, middlebit);
                skip = 1;
            }
        } else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
            for (var i = 0; i < node.childNodes.length; ++i) {
                i += innerHighlight(node.childNodes[i], pat);
            }
        }
        return skip;
    }
    return this.length && pat && pat.length ? this.each(function () {
        innerHighlight(this, pat.toUpperCase());
    }) : this;
};

/* Search scoring functionality [Start] */

var QnASearch = {
    settings: {
        mspId: function () {
            if (dataLayer[0].pagetype === 'single') {
                return dataLayer[0].mspid && dataLayer[0].mspid;
            } else if ($('.js-prdct-ttl').data('mspid') || dataLayer[0].pagetype === 'qnaSingle') {
                return $('.js-prdct-ttl').data('mspid') 
            } else if (dataLayer[0].pagetype === 'qnaList') {
                
            }
        },
        qnaApi: function () {
            return '/review/qna/search/?mspid='+QnASearch.settings.mspId();
        },
        inputSelector: function () {
            if (dataLayer[0].pagetype === 'single') {
                return '.js-qstn-txt';
            } else if ($('.js-prdct-ttl').data('mspid') || dataLayer[0].pagetype === 'qnaSingle') {
                return '.js-qstn-txt';
                
            } else if (dataLayer[0].pagetype === 'qnaList') {
                
            }
        },
        questionCount: 5, // number of questions in search result
        answerCount: 3, // number of answers in respective question search result if keyword found
        weightage: {
            fullMatch: 2,
            partialMatch: 1,
            uniqueMatch: 3,
            repeatMatch: 2,
            sequence: 1.5,
            caseMatch: 2,
            minRelevance: .6
        },
      stopWords: ['i','the', 'is', 'a', 'all', 'am', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'in', 'into', 'it', 'its', 'my', 'no', 'nor', 'not', 'of', 'on', 'or', 'that', 'then', 'this', 'to', 'was', 'were','does','has','have','had','when','where','which','what','how','do','why','who','whose','if','both','we','will','with','without']
    },
    data: {
        searchWordsArr: [],
        sDataJson: {},
        sequence: [],
        qnaJson: '',
        
    },
    buildFunction: {
        init: function(url) {
               return QnASearch.data.searchWordsArr = QnASearch.buildFunction.getJson(url).done(function (response) {
                    //var jsonData = sDataJson = response;
                   QnASearch.data.qnaJson = response;
                   QnASearch.data.sDataJson = response;
                    return QnASearch.buildFunction.splittingInWordsArray(QnASearch.data.qnaJson);
                });
        },
        getJson: function (url) {
            var dfd = $.Deferred();
            $.ajax({
                url: url,
                dataType: 'json'
            }).done(function (response) {
                mData = response;
                return dfd.resolve(response);
            });
            return dfd.promise();
        },
        keywordArrayToJson: function (questionId, searchArr, wordArr, valueFactor, arrayType, answerWordIndex) {
            for (var i = 0; i < wordArr.length; i++) {
                if (wordArr[i] == '') {
                    break;
                }
                searchArr.push({
                    'word': wordArr[i],
                    'questionId': questionId,
                    'answerWordIndex': answerWordIndex,
                    'valueFactor': valueFactor,
                    'sentenceIndex': i,
                    'searchArrayIndex': searchArr.length
                });
            }
            return searchArr;
        },
        splittingInWordsArray: function (mData) {
            var tempObj = {},
                searchArr = [],
                answerWordIndex;
            for (id in mData) {
                var wordArr = (mData[id].question).replace(/[^a-zA-Z0-9' ]/g, '').split(' ').filter(function () {
                    return true;
                });
                answerWordIndex = id + '-' + '0';
                searchArr = QnASearch.buildFunction.keywordArrayToJson(id, searchArr, wordArr, 0.2, "question", answerWordIndex);
                for (var j = 0; j < mData[id].answer.length; j++) {
                    var answerWords = mData[id].answer[j].replace(/[^a-zA-Z0-9' ]/g, '').split(' ').filter(function () {
                        return true;
                    });
                    answerWordIndex = id + '-' + j;
                    searchArr = QnASearch.buildFunction.keywordArrayToJson(id, searchArr, answerWords, 0.2, 'answer', answerWordIndex);
                    QnASearch.generalFunction.wipeAnArray(answerWords);
                    answerWords = [];
                }
                wordArr = [];
            };
            searchArr = QnASearch.generalFunction.sortedByWord(searchArr);
            QnASearch.data.builtData = searchArr; 
            return searchArr;
        }

    },
    domObject: {
        $loader: '<div class="ldr__ovrly" style="height:50px;position: relative; overflow: hidden;">\
                    <div class="ldr ldr--s">\
                        <div class="ldr__crcl"></div>\
                    </div>\
                </div>',
    },
    generalFunction: {
        sortedByWord: function (searchArray) {
            searchArray.sort(function (a, b) {
                var alc = a.word.toLowerCase().toString(),
                    blc = b.word.toLowerCase().toString();
                return alc > blc ? 1 : alc < blc ? -1 : 0;
            });
            return searchArray;
        },
        sortQuestionsAns: function (resultArr) {
            resultArr.sort(function (a, b) {
                return b.matchScore - a.matchScore
            });
            return resultArr;
        },
        wipeAnArray: function (array) {
            return array = [];
        },
        highlightText: function (selectorObj, searchItems) {
            for (var i = 0; i < searchItems.length; i++) {
                selectorObj.highlight(searchItems[i]);
            }
        },
        keywordCleaner: function (term) {
            if (!term) {
                return false; 
            }
            var stopWords = QnASearch.settings.stopWords;
            return term.replace(/[.\,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').replace(
                /[\s]+/g, ' ').split(' ').reduce(function (a, v) {
                    if (v.length > 0 || (v === v.toUpperCase() && v.length > 1)) {
                        if (stopWords.indexOf(v.toLowerCase()) == -1) {
                            a.push(v);
                        }
                    }
                    return a;
                }, []);
        }
    },
    binarySearch: function (searchArray, searchElement, caseInsensitive) {
        if (typeof searchArray === 'undefined' || searchArray.length <= 0 || typeof searchElement === 'undefined' ||
            searchElement === '') {
            return -1;
        }
        var array = searchArray,
            key = searchElement,
            keyArr = [],
            len = array.length,
            ub = (len - 1),
            p = 0,
            mid = 0,
            lb = p;

        key = caseInsensitive && key && typeof key == 'string' ? key.toLowerCase() : key;

        function isCaseInsensitive(caseInsensitive, element) {
            return caseInsensitive && element.word && typeof element.word == 'string' ? (element.word).toLowerCase() :
                element.word;
        }
        while (lb <= ub) {
            mid = parseInt(lb + (ub - lb) / 2, 10);

            if (isCaseInsensitive(caseInsensitive, array[mid]).indexOf(key) > -1) {
                keyArr.push(mid);
                if (keyArr.length > len) {
                    return keyArr;
                } else if (array[mid + 1] && isCaseInsensitive(caseInsensitive, array[mid + 1]).indexOf(key) > -1) {
                    for (var i = 1; i < len; i++) {
                        if (array[mid + 1] && isCaseInsensitive(caseInsensitive, array[mid + i]).indexOf(key) == -1) {
                            break;
                        } else {
                            keyArr.push(mid + i);

                        }
                    }
                }
                if (keyArr.length > len) {
                    return keyArr;
                } else if (array[mid - 1] && isCaseInsensitive(caseInsensitive, array[mid - 1]).indexOf(key) > -1) {
                    for (var i = 1; i < len; i++) {

                        if (isCaseInsensitive(caseInsensitive, array[mid - i]).indexOf(key) == -1) {
                            break;
                        } else {
                            keyArr.push(mid - i);
                        }
                    }
                }
                return keyArr;
            } else if (key > isCaseInsensitive(caseInsensitive, array[mid])) {
                lb = mid + 1;
            } else {
                ub = mid - 1;
            }
        }
        return -1;

    },
    getSearchResult: function (searchKeywordsArr, builtData) {
        var builtData = builtData,
            termArr = searchKeywordsArr,
            resultArr = [],
            tempObj = [],
            wordOccurrence;
        if (termArr.length > 0) {
            for (var i = 0, iLen = termArr.length; i < iLen; i++) {
                termArrIndex = QnASearch.binarySearch(builtData, termArr[i], true, 'multiple');
                if (termArrIndex !== -1 && termArrIndex.length >= 1) {
                    $.each(termArrIndex, function (indx, vlu) { // if results are comming in array ie. multiple occurrence of a word;
                        var questionId = builtData[vlu].questionId; // Every pair of answer and question contains a unique id.
                        var answerWordIndex = builtData[vlu].answerWordIndex; // If it is answer keyword it contains word index in that sentence

                        //Pass only array of object of highest matchScore question and answer;

                        if (! QnASearch.data.sDataJson[questionId].wordOccurrence) {
                             QnASearch.data.sDataJson[questionId].wordOccurrence = [];
                             QnASearch.data.sDataJson[questionId].wordOccurrence.push(builtData[vlu].word);
                            wordOccurrence = 1;
                        } else if ( QnASearch.data.sDataJson[questionId].wordOccurrence.indexOf(builtData[vlu].word) > -1) {
                             QnASearch.data.sDataJson[questionId].wordOccurrence.push(builtData[vlu].word);
                            wordOccurrence = 2;
                        } else {
                             QnASearch.data.sDataJson[questionId].wordOccurrence.push(builtData[vlu].word);
                            wordOccurrence = 1;
                        }

                        //squnc_id
                        var matchScore = 0;

                        if (wordOccurrence > 1) {
                            //Repeat Word [Tested]
                            matchScore += parseInt(QnASearch.settings.weightage.repeatMatch);
                        } else if (wordOccurrence === 1) {
                            //Unique Word [Tested]
                            matchScore += parseInt(QnASearch.settings.weightage.uniqueMatch);
                        }

                        if (termArr[i].toLowerCase() === builtData[vlu].word.toLowerCase()) {
                            //Full Search [Tested]
                            matchScore *= QnASearch.settings.weightage.fullMatch;
                        } else {
                            //Partial Search [Tested]
                            matchScore *= QnASearch.settings.weightage.partialMatch;
                        }

                        if (termArr[i] === builtData[vlu].word) {
                            //Case Sensitive [Tested]
                            matchScore *= QnASearch.settings.weightage.caseMatch;
                        } else {
                            //Case Insensitive
                            //Do Nothing as of now
                        }

                        // sequence search matchscore
                        /* Checking if the result keyword completely matching with search keyword
                        if yes, on first iteration saving the keyword's original index position(searchArrayIndex) in json's keyword array.
                        onwords iterations, Checking if the searchArrayIndex exist in sequence array if not push again in sequence array
                        if exists, checking if current word's previous searchArrayIndex exist in sequence array using 'for loop'.
                        if current word's previous word (searchArrayIndex-1) contains in sequence array, we are alloting match score. */
                        if (QnASearch.data.sequence.length === 0 && termArr[i].toLowerCase() === builtData[vlu].word.toLowerCase()) {
                            QnASearch.data.sequence.push(builtData[vlu].searchArrayIndex);
                        } else {
                            if ((QnASearch.data.sequence.indexOf((builtData[vlu].searchArrayIndex - 1)) > -1)) { // On every input 
                                matchScore *= QnASearch.settings.weightage.sequence;
                            } else {
                                QnASearch.data.sequence.push(builtData[vlu].searchArrayIndex);
                            }
                        }

                        if (tempObj.length < 1) {
                            tempObj.push({
                                questionId: questionId,
                                answerWordIndex: answerWordIndex,
                                matchScore: matchScore
                            });
                        } else {
                            var flag = false;
                            for (var p = 0, pLen = tempObj.length; p < pLen; p++) {
                                if (tempObj[p].questionId === questionId) {
                                    tempObj[p].matchScore += parseInt(matchScore);
                                    tempObj[p].answerWordIndex += ((tempObj[p].answerWordIndex).indexOf(answerWordIndex) > -1) ? '' : '|' +
                                        answerWordIndex;
                                    flag = true;
                                }
                            }
                            if (!flag) {
                                tempObj.push({
                                    questionId: questionId,
                                    answerWordIndex: answerWordIndex,
                                    matchScore: matchScore
                                });
                            }

                        }
                    });

                }
            }
        }
        for (var d = 0, dlen = tempObj.length; d < dlen; d++) {
            delete  QnASearch.data.sDataJson[tempObj[d].questionId].wordOccurrence
        }
        QnASearch.data.sequence = QnASearch.generalFunction.wipeAnArray(QnASearch.data.sequence)
        return tempObj;
    },
    processSearch: function (searchKeywords) {
        var searchResultArr,
            sortedSearchResult,
            status,
            builtData = QnASearch.data.builtData;
        
        if (searchKeywords.length < 1) {
            return false;
        }
        // Searching and matching score [Start]
         searchResultArr = QnASearch.getSearchResult(searchKeywords, builtData);
        // Searching and matching score [End]

        sortedSearchResult = searchResultArr.length && QnASearch.generalFunction.sortQuestionsAns(searchResultArr); //resultArr; 

        // Dom Building time [Start]
        var searchResultJson = sortedSearchResult.length && QnASearch.searchResultJson(sortedSearchResult);
        var dom = searchResultJson && QnASearch.domFunction.createHtml(searchResultJson);
        isAppend = QnASearch.domFunction.append(dom, searchKeywords);
        QnASearch.domFunction.remove(isAppend, searchKeywords);
        return dom;
    },
    domFunction: {
            createHtml: function (jsonObj) {
                var dom = '',
                    questionId,
                    questionIdNumeric,
                    answer = '',
                    answerCount;
                for (id in jsonObj) {
                    questionId = jsonObj[id].q_id;
                    questionIdNumeric = (questionId).replace(/[^0-9]/g, ''),
                    answerCount = jsonObj[id].answer.length
                    answer += ' <div class="qna__answr-wrpr">';
                    if (answerCount > 0) {
                        for (var i = 0; i < jsonObj[id].answer.length; i++) {
                            answer += '<div class="qna__answr clearfix" style="display:block">' + jsonObj[id].answer[i] + '</div>';
                        }
                    } else {
                        answer += '<div class="qna__answr clearfix" style="display:block; opacity: 0.3;">' + 'This question has no answer yet ' + '</div>';
                    }
                    answer += '</div>';
                    var tempDom = '<div class="qna__item js-qna__item clearfix" data-qid="' + questionId + '" data-ans-count="' + answerCount + '">\
                   <a class="qna__item--href js-qna__item--href" target="_blank" href="/review/qna/redesign/single.php?ref=qna-search&q_id=' + questionIdNumeric + '"> <div class="qna__qstn">' + jsonObj[id].question + '</div>\
                       ' + answer + '\
                   </a></div>';

                    dom += tempDom;
                    answer = question = tempDom = '';
                }
                return dom;
            },
        remove: function (status, searchKeyword) {
            if (dataLayer[0].pagetype === 'single') {
                if (!status && searchKeyword) {
                    $('.ldr__ovrly').remove();
                    $('.qna__body--search').html('<div class="ldr--stts js-ldr--stts" style="margin:20px 5px auto; text-align: center;">Seems like nobody ask this question. Please click "Ask Question" button </div>')
                } else if (!status && !searchKeyword) {
                    $('.ldr__ovrly, .js-ldr--stts').remove();
                    $('.qna__body--search').html('');
                    $('.qna__body').css('display', 'block');
                }
                return true;
            } else if (dataLayer[0].pagetype === 'qnaSingle') {

            } else if (dataLayer[0].pagetype === 'qnaList') {

            }
            return false;
        },
        append: function (dom, filteredSearchKeywords) {
            var $qnaDiv
            if (dom) {
                if (dataLayer[0].pagetype === 'single') {
                    $qnaDiv = $('.qna__body--search');
                    $('.ldr__ovrly, .qna__body').css('display', 'none');

                } else if (dataLayer[0].pagetype === 'qnaSingle') {
                    

                } else if (dataLayer[0].pagetype === 'singleList') {
                   
                }
                $qnaDiv.append(dom); 
                QnASearch.generalFunction.highlightText($qnaDiv, filteredSearchKeywords);
            } else {
                return false;
            }
            return true;
        },
        loaderHandler: function (){
            $('.qna__body').css('display', 'none'); // existing qna container
            $('.qna__body--search').html(''); // wiping search result container for new results 
            $('.qna__body--search').append(QnASearch.domObject.$loader); // appending loader in search container untill processing
            $('.ldr__ovrly').css({ // made loader visible
                'display': 'block',
            });
        }
    },
    searchResultJson: function (sortedSearchedInfo) {
        var len = sortedSearchedInfo.length > QnASearch.settings.questionCount ? QnASearch.settings.questionCount : sortedSearchedInfo.length,
            searchResultObj = {},
            question,
            matchScore,
            questionId,
            questionIdNumeric,
            answer = [],
            ansId;
        for (var p = 0; p < len; p++) {
            questionId = sortedSearchedInfo[p].questionId;
            matchScore = sortedSearchedInfo[p].matchScore;
            questionIdNumeric = (questionId).replace(/[^0-9]/g, '');
            question = QnASearch.data.sDataJson[questionId].question;
            var ansGroup = sortedSearchedInfo[p].answerWordIndex ? (sortedSearchedInfo[p].answerWordIndex).split('|') : 0; 
         
            ansGroupLength = ansGroup.length > QnASearch.settings.answerCount ? QnASearch.settings.answerCount : ansGroup.length;
            for (var i = 0; i < ansGroupLength; i++) {
                ansId = ansGroup[i] ? ansGroup[i].split('-') : '';
                answer.push(QnASearch.data.sDataJson[questionId].answer[ansId[1]]);
            }
           
            searchResultObj[p] = {};
            searchResultObj[p].question = question;
            searchResultObj[p].answer = answer[0]=== undefined?[]:answer;
            searchResultObj[p].q_id = questionId;
            searchResultObj[p].matchScore = matchScore;
            answer = []; // resetting the answer array for new object
        }
        return searchResultObj;
    },
    eventFunction: {
        searchInput: function ($this) {
            var searchKeyword = $this.val().trim(),
                filteredSearchKeywords;
            filteredSearchKeywords = QnASearch.generalFunction.keywordCleaner(searchKeyword);
            dom = QnASearch.processSearch(filteredSearchKeywords);
           
        }
    }

};
    
// QnA Search code [Needs to be refactor]
var timeout,
    searchTrigger;
$(document).on('input', QnASearch.settings.inputSelector(), function ($jsonUrl) {
    if (!QnASearch.settings.inputSelector()) {
        return;
    }
    var $this = $(this);
    if (QnASearch.data.searchWordsArr.length < 1) {
        QnASearch.data.searchWordsArr = QnASearch.buildFunction.init(QnASearch.settings.qnaApi());
    } else {
        QnASearch.domFunction.loaderHandler();
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            QnASearch.eventFunction.searchInput($this);
        }, 200);
    }
    if (window.ga && !searchTrigger) {
        ga('send', 'event', 'QNA', 'search', QnASearch.settings.inputSelector());
        searchTrigger = true;
    }
});
