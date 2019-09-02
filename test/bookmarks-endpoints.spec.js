const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, makeMaliciousBookmarksArray } = require('./bookmarks.fixtures')
const xss = require('xss')

function sanatizeAllBookmarks(inputedBookmarks) {
    let bookmarksToReturn;
    bookmarksToReturn = [];
    for (let i = 0; i < inputedBookmarks.length; i++) {
        let thisBookmark = inputedBookmarks[i]
        let thisBookmarkSanitized = thisBookmark
        thisBookmarkSanitized.title = xss(thisBookmarkSanitized.title)
        thisBookmarkSanitized.description = xss(thisBookmarkSanitized.description)
        thisBookmarkSanitized.url = xss(thisBookmarkSanitized.url)
        bookmarksToReturn.push(thisBookmarkSanitized)
    }
    return bookmarksToReturn;
}

function sanatizeOneBookmark(inputedBookmark) {
    let bookmarkToReturn = {
        id: inputedBookmark.id,
        title: xss(inputedBookmark.title),
        url: xss(inputedBookmark.url),
        rating: inputedBookmark.rating,
        description: xss(inputedBookmark.description)
    };
    return bookmarkToReturn;
}

let db

before('make knex instance', () => {
    db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL
    })
    app.set('db', db)
})

before('clean the table', () => db('bookmarks').truncate())

afterEach('cleanup', () => db('bookmarks').truncate())

after('disconnect from db', () => db.destroy())

describe(`POST /api/bookmarks`, () => {
    context('Given all requirements are met for the new bookmark and url starts with http://', () => {
        it('creates a bookmark, responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'New Bookmark Title',
                description: 'New Bookmark Description',
                rating: 5,
                url: "http://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    const expected = {
                        id: 1,
                        title: 'New Bookmark Title',
                        description: 'New Bookmark Description',
                        rating: 5,
                        url: "http://newbookmarkurl.com"
                    }
                    const actual = res.body
                    expect(actual).to.eql(expected)
                })
        })
    })

    context('Given all requirements are met for the new bookmark and url starts with https://', () => {
        it('creates a bookmark, responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'New Bookmark Title',
                description: 'New Bookmark Description',
                rating: 5,
                url: "https://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    const expected = {
                        id: 1,
                        title: 'New Bookmark Title',
                        description: 'New Bookmark Description',
                        rating: 5,
                        url: "https://newbookmarkurl.com"
                    }
                    const actual = res.body
                    expect(actual).to.eql(expected)
                })
        })
    })

    context('Given all requirements are met for the new bookmark and contains an XSS attack', () => {
        it('sanitizes and creates the bookmark, responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: "<img src='https://url.to.file.which/does-not.exist' onerror='alert(document.cookie);'>",
                rating: 1,
                description: "<script>alert('xss');</script>",
                url: `https://geekprank.com/fake-virus/<script>alert('xss');</script>`
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    const unsanitized = {
                        id: 1,
                        title: "<img src='https://url.to.file.which/does-not.exist' onerror='alert(document.cookie);'>",
                        rating: 1,
                        description: "<script>alert('xss');</script>",
                        url: `https://geekprank.com/fake-virus/<script>alert('xss');</script>`
                    }
                    const expected = sanatizeOneBookmark(unsanitized)
                    const actual = res.body
                    expect(actual).to.eql(expected)
                })
        })
    })

    context('Given the title is missing from the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                description: 'New Bookmark Description',
                rating: 5,
                url: "http://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given the URL is missing from the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                description: 'New Bookmark Description',
                rating: 5,
                title: 'New Bookmark Title',
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given the rating is missing from the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                description: 'New Bookmark Description',
                url: "http://newbookmarkurl.com",
                title: 'New Bookmark Title',
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given rating is not a number in the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                title: 'New Bookmark Title',
                description: 'New Bookmark Description',
                rating: "5",
                url: "http://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given rating is a number less than 1 in the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                title: 'New Bookmark Title',
                description: 'New Bookmark Description',
                rating: 0.9,
                url: "http://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given rating is a number greater than or equal to 6 in the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                title: 'New Bookmark Title',
                description: 'New Bookmark Description',
                rating: 6,
                url: "http://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given title is not a string in the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                title: true,
                description: 'New Bookmark Description',
                rating: 6,
                url: "http://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given description is not a string in the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                title: "New bookmark title",
                description: 7,
                rating: 6,
                url: "http://newbookmarkurl.com"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given url is not a string in the new bookmark', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                title: "New bookmark title",
                description: "New bookmark description",
                rating: 6,
                url: true
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given url does not start with http:// or https://', () => {
        it('Returns a 400 error', () => {
            const newBookmark = {
                title: "New bookmark title",
                description: "New bookmark description",
                rating: 6,
                url: "invalidurl"
            }

            return supertest(app)
                .post('/api/bookmarks/')
                .send(newBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

})

describe(`Delete /api/bookmarks/:id`, () => {
    context('Given the bookmark ID exists', () => {
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it(`successfully deletes the bookmark and returns with a 204 status`, () => {
            return supertest(app)
                .delete(`/api/bookmarks/1`)
                .expect(204)
                .then(res => {
                    let expectedBookmarks = [testBookmarks[1], testBookmarks[2]];
                    return supertest(app)
                        .get('/api/bookmarks/')
                        .expect(expectedBookmarks)
                }
                )
        })
    })

    context('Given the bookmark ID does not exist', () => {
        it(`responds with a 404 error`, () => {
            return supertest(app)
                .delete(`/api/bookmarks/1`)
                .expect(404)
        })
    })
})

describe(`GET /api/bookmarks`, () => {
    context('Given there are bookmarks in the database', () => {
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('responds with 200 and all bookmarks in the database', () => {
            return supertest(app)
                .get('/api/bookmarks')
                .expect(200, testBookmarks)
        })
    })

    context('Given no bookmarks', () => {
        it('responds with 200 and an empty list', () => {
            return supertest(app)
                .get('/api/bookmarks')
                .expect(200, [])
        })
    })

    context('Given there are bookmarks in the database and there is malicious code in one or more of them', () => {
        const testBookmarks = makeMaliciousBookmarksArray()
        const sanitizedTestBookmarks = sanatizeAllBookmarks(testBookmarks)

        beforeEach('insert bookmarks including malicious bookmark', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('removes xss attack content', () => {
            return supertest(app)
                .get(`/api/bookmarks/`)
                .expect(200)
                .expect(res => {
                    expect(res.body).to.eql(sanitizedTestBookmarks)
                })
        })
    })
})

describe(`GET /api/bookmarks/:id`, () => {
    context('Given the bookmark exists', () => {
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('responds with 200 and the specified bookmark', () => {
            const bookmarkId = 3
            const expectedBookmark = testBookmarks[bookmarkId - 1]
            return supertest(app)
                .get(`/api/bookmarks/${bookmarkId}`)
                .expect(200, expectedBookmark)
        })

    })
    context('Given the bookmark does not exists', () => {

        it('responds with 200 and the specified bookmark', () => {
            const bookmarkId = 3
            return supertest(app)
                .get(`/bookmarks/${bookmarkId}`)
                .expect(404)
        })

    })

    context('Given the bookmark exists and there is malicious code in it', () => {
        const testBookmarks = makeMaliciousBookmarksArray()
        const maliciousBookmark = testBookmarks[3]
        const sanitizedMaliciousBookmark = sanatizeOneBookmark(maliciousBookmark)

        beforeEach('insert bookmarks including malicious bookmark', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('removes xss attack content', () => {
            return supertest(app)
                .get(`/api/bookmarks/${maliciousBookmark.id}`)
                .expect(200)
                .expect(res => {
                    expect(res.body).to.eql(sanitizedMaliciousBookmark)
                })
        })
    })
})

describe.only(`PATCH /api/bookmarks/:id`, () => {
    context('Given all fields are to be updated and met requirements and the url starts with http://', () => {
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })


        it('updates the bookmark and responds with a 204', () => {
            let updatedBookmark = {
                title: 'Updated Bookmark Title',
                description: 'Updated Bookmark Description',
                rating: 1,
                url: "http://updatedbookmarkurl.com"
            }

            return supertest(app)
                .patch(`/api/bookmarks/1`)
                .send(updatedBookmark)
                .expect(204)
                .then(res => {
                    updatedBookmark.id = 1;

                    return supertest(app)
                        .get('/api/bookmarks/1')
                        .expect(updatedBookmark)
                })
        })
    })

    context('Given all fields are to be updated and met requirements and the url starts with https://', () => {
        const testBookmarks = makeBookmarksArray()
        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })


        it('updates the bookmark and responds with a 204', () => {
            let updatedBookmark = {
                title: 'Updated Bookmark Title',
                description: 'Updated Bookmark Description',
                rating: 1,
                url: "https://updatedbookmarkurl.com"
            }

            return supertest(app)
                .patch(`/api/bookmarks/1`)
                .send(updatedBookmark)
                .expect(204)
                .then(res => {
                    updatedBookmark.id = 1;

                    return supertest(app)
                        .get('/api/bookmarks/1')
                        .expect(updatedBookmark)
                })
        })
    })

    context(`Given all fields are to be updated and met requirements and contains an XSS attack`, () => {
        const testBookmarks = makeBookmarksArray()
        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it(`Updates the bookmark with sanatized fields and responds with a 204`, () => {
            let updatedBookmark = {
                title: `Updated Bookmark Title with <script>alert('xss');</script>`,
                description: `Updated Bookmark Description with <script>alert('xss');</script>`,
                rating: 1,
                url: `https://geekprank.com/fake-virus/<script>alert('xss');</script>`
            }

            return supertest(app)
                .patch(`/api/bookmarks/1`)
                .send(updatedBookmark)
                .expect(204)
                .then(res => {
                    const expectedBookmark = {
                        id: 1,
                        title: xss(updatedBookmark.title),
                        description: xss(updatedBookmark.description),
                        rating: updatedBookmark.rating,
                        url: xss(updatedBookmark.url)
                    }

                    return supertest(app)
                        .get('/api/bookmarks/1')
                        .expect(expectedBookmark)
                })
        })
    })

    context('Given all fields are missing in the patch request', () => {
        const testBookmarks = makeBookmarksArray()
        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it(`Returns a 400 error`, () => {
            const emptyObject = {}
            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(emptyObject)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given rating is not a number in the fields to be updated', () => {
        it('Returns a 400 error', () => {
            const updatedBookmark = {
                title: 'updated Bookmark Title',
                description: 'updated Bookmark Description',
                rating: "5",
                url: "http://updatedbookmarkurl.com"
            }

            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(updatedBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given rating is a number less than 1 in the fields to be updated', () => {
        it('Returns a 400 error', () => {
            const updatedBookmark = {
                title: 'updated Bookmark Title',
                description: 'updated Bookmark Description',
                rating: 0.9,
                url: "http://updatedbookmarkurl.com"
            }

            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(updatedBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given rating is a number greater than or equal to 6 in the fields to be updated', () => {
        it('Returns a 400 error', () => {
            const updatedBookmark = {
                title: 'updated Bookmark Title',
                description: 'updated Bookmark Description',
                rating: 6,
                url: "http://updatedbookmarkurl.com"
            }

            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(updatedBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given title is not a string in the fields to be updated', () => {
        it('Returns a 400 error', () => {
            const updatedBookmark = {
                title: false,
                description: 'updated Bookmark Description',
                rating: 1,
                url: "http://updatedbookmarkurl.com"
            }

            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(updatedBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given description is not a string in the fields to be updated', () => {
        it('Returns a 400 error', () => {
            const updatedBookmark = {
                title: 'updated bookmark title',
                description: true,
                rating: 1,
                url: "http://updatedbookmarkurl.com"
            }

            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(updatedBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given url is not a string in the fields to be updated', () => {
        it('Returns a 400 error', () => {
            const updatedBookmark = {
                title: 'updated bookmark title',
                description: 'updated Bookmark Description',
                rating: 5,
                url: 7
            }

            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(updatedBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given url does not start with http:// or https:// in the fields to be updated', () => {
        it('Returns a 400 error', () => {
            const updatedBookmark = {
                title: 'updated bookmark title',
                description: 'updated Bookmark Description',
                rating: 5,
                url: "invalidurl"
            }

            return supertest(app)
                .patch('/api/bookmarks/1')
                .send(updatedBookmark)
                .expect(res => {
                    expect(400)
                })
        })
    })

    context('Given at least one but not all fields are present in the fields', () => {
        beforeEach('insert bookmarks', () => {
            const testBookmarks = makeBookmarksArray()
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('updates the bookmark and responds with a 204', () => {
            let updatedBookmark = {
                title: 'Updated Bookmark Title'
            }

            return supertest(app)
                .patch(`/api/bookmarks/1`)
                .send(updatedBookmark)
                .expect(204)
                .then(res => {
                    const testBookmarks = makeBookmarksArray()
                    let expectedBookmark = testBookmarks[0]
                    expectedBookmark.title = updatedBookmark.title

                    return supertest(app)
                        .get('/api/bookmarks/1')
                        .expect(expectedBookmark)
                })
        })

    })


})