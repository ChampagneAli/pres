"use strict";
// Some comments are added to make things clearer
let fun = (f) => ({
    f: f,
    then: function (g) {
        return then(this, g);
    }
});
const then = (f, g) => fun(a => g.f(f.f(a)));
// Pick pakt van T alles in K ; example: Pick<Student, Name> => Dit pakt de naam van de geselecteerde student
const pick = (keys) => (fun(object => keys.map(key => key in object ? { [key]: object[key] } : {})
    .reduce((Accumulator, currentValue) => ({ ...Accumulator, ...currentValue }), {})));
// Pakt van een object T, alle bestaande keys; example => pakt alle keys van student => name, surname, studennummer
const GetAllKeysOffObject = (object) => Object.keys(object);
const omit = (keys) => (fun(object => GetAllKeysOffObject(object).map(key => keys.includes(key) ? {} : { [key]: object[key] })
    .reduce((Accumulator, currentValue) => ({ ...Accumulator, ...currentValue }), {})));
let Unit = {};
// After using the orderby the result gets saved in Result
let Result = function (result) {
    return {
        result: result
    };
};
// Implementation of SelectableStudent
let SelectableStudent = function (object) {
    return {
        object: object,
        select: function (...entities) {
            let res = ([]);
            for (let i = 0; i < object.length; i++) {
                // If multiple items inside Grades or Teachers
                if (Array.isArray(object[i]) && Object.keys(object[i]).length > 1) {
                    // subarray is de key => Grades of Teachers - object[i] is Grades of Teachers
                    let subArray = object[i];
                    res[i] = [];
                    // i = Grades or Teachers
                    // g = The items within array of Grades or Teachers
                    for (let g = 0; g < subArray.length; g++) {
                        // [g] = index of the keys of Grades or Teachers
                        res[i].push(pick(entities).f(subArray[g]));
                    }
                }
                else {
                    // If there's no array you add the items to the result
                    // [i] = used for index
                    res[i] = pick(entities).f(object[i]);
                }
            }
            // Omit object
            // This part makes sure that the already selected items should not be able to reselect in further selects =>
            // example: select(Name).select(x) => x will have all entities except Name
            const newObject = ([]);
            object.forEach(element => {
                newObject.push(omit(entities).f(element));
            });
            // Returns Queryable student object with the new object + new result
            return QueryableStudent(newObject, res);
        }
    };
};
let QueryableStudent = function (object, result) {
    return {
        object: object,
        result: result,
        select: function (...entities) {
            let res = ([]);
            for (let i = 0; i < object.length; i++) {
                res[i] = {
                    ...result[i],
                    ...pick(entities).f(object[i])
                };
                // This next part works for the include because it uses arrays
                if (object[i][0]) {
                    res[i] = [];
                    // For all the items in the array -> you will add the items to your result + the old result
                    for (let g = 0; g < Object.keys(object[i]).length; g++) {
                        // res for the items that are not an array. old result + new result thru a spread
                        res[i][g] = {
                            ...result[i][g],
                            ...pick(entities).f(object[i][g])
                        };
                    }
                }
            }
            const newObject = ([]);
            object.forEach(element => {
                newObject.push(omit(entities).f(element));
            });
            // returns new object and the ( old result + new result) ( old B + new B )
            return QueryableStudent(newObject, res);
        },
        include: function (entity, query) {
            // Push the enitity K into an array. This makes sure you can use the omit good
            const entityArray = [];
            entityArray.push(entity);
            // This creates a new object that does not have the entity K
            const newObject = ([]);
            object.forEach(element => {
                newObject.push(omit(entityArray).f(element));
            });
            // Push all the entities you have received into an array
            const allKeysFromEntity = ([]);
            object.forEach(element => {
                allKeysFromEntity.push(element[entity]);
            });
            // This turns allKeysFromEntity into an SelectableStudent
            const selectableEntity = SelectableStudent(allKeysFromEntity);
            // Gets result of SelectableStudent, this makes it possible to put them into a new result
            const selectedEntities = query(selectableEntity).result;
            let res = ([]);
            // Foreach student you build a new result
            for (let i = 0; i < object.length; i++) {
                // Old res + New res
                res[i] = {
                    ...result[i],
                    ...{ [entity]: selectedEntities[i] }
                };
            }
            // Returns a new object and the ( old result + new result ) + ( old B + new B )
            return QueryableStudent(newObject, res);
        },
        orderBy: function (type, entity) {
            const resultaat = result;
            let orderedResult = result;
            // If the enitity within your result is an array. Than you can order the enitities
            if (resultaat[0][entity]) {
                orderedResult = result.sort(dynamicSort(entity));
            }
            else {
                // If it is not an array, you go by each index in your result and sort them
                // <any>element can be the Name, surname and studentnumber, etc etc
                for (let index = 0; index < resultaat.length; index++) {
                    const element = resultaat[index];
                    element.sort(dynamicSort(entity));
                }
            }
            function dynamicSort(property) {
                var sortOrder = type === 'ASCENDING' ? 1 : -1;
                // fst = the first item in Grades or Teachers,
                // snd = the second item in Grades or Teachers,
                // fst & snd are compared
                return function (fst, snd) {
                    if (fst[property] === String) {
                        // First letter is turned into uppercase, the remaining string gets glued back together by slice.
                        const uppercaseFirst = fst[property].charAt(0).toUpperCase() + fst[property].slice(1);
                        const uppercaseSecond = snd[property].charAt(0).toUpperCase() + snd[property].slice(1);
                        // sorts the 2 strings
                        var res = (uppercaseFirst < uppercaseSecond) ? -1 : (uppercaseFirst > uppercaseSecond) ? 1 : 0;
                        return res * sortOrder;
                    }
                    else {
                        // This is used for non strings, such as floats or numbers
                        var res = (fst[property] < snd[property]) ? -1 : (fst[property] > snd[property]) ? 1 : 0;
                        return res * sortOrder;
                    }
                };
            }
            return Result(orderedResult);
        }
    };
};
let student = ({
    Name: 'Ali',
    StudentNumber: 7,
    Surname: 'Musharuf',
    Grades: [{
            Grade: 9,
            CourseId: 1
        },
        {
            Grade: 7,
            CourseId: 4
        }
    ],
    Teachers: [{
            Name: 'Jan',
            Surname: 'Jansen'
        },
        {
            Name: 'Piet',
            Surname: 'Velden'
        }
    ]
});
let student_two = ({
    Name: 'Freek',
    StudentNumber: 4,
    Surname: 'Zonneveld',
    Grades: [{
            Grade: 6,
            CourseId: 5,
        },
        {
            Grade: 8,
            CourseId: 6,
        }],
    Teachers: [{
            Name: 'Tina',
            Surname: 'Turner'
        },
        {
            Name: 'Stevie',
            Surname: 'Wonder'
        }]
});
let student_three = ({
    Name: 'Molly',
    StudentNumber: 6,
    Surname: 'Dijkzigt',
    Grades: [{
            Grade: 4,
            CourseId: 9,
        },
        {
            Grade: 5,
            CourseId: 3,
        }],
    Teachers: [{
            Name: 'Antonio',
            Surname: 'Letterman'
        },
        {
            Name: 'Britney',
            Surname: 'Spears'
        }]
});
let student_four = ({
    Name: 'Delany',
    StudentNumber: 1,
    Surname: 'Grootzicht',
    Grades: [{
            Grade: 3.5,
            CourseId: 12,
        },
        {
            Grade: 3,
            CourseId: 7,
        }],
    Teachers: [{
            Name: 'Angelo',
            Surname: 'Tielemans'
        },
        {
            Name: 'Marieke',
            Surname: 'Kijkers'
        }]
});
let AllStudents = [student, student_two, student_three, student_four];
let QueryableStudents = SelectableStudent(AllStudents);
// JSON stringify is used to pretty print the result
let query = JSON.stringify(QueryableStudents
    .select('StudentNumber')
    .select('Name', 'Surname')
    .include('Grades', q => q.select('Grade', 'CourseId'))
    .include('Teachers', t => t.select('Name').orderBy('ASCENDING', 'Name'))
    .orderBy('ASCENDING', 'StudentNumber').result, null, 4);
console.log('query', query);
