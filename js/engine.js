

   <script type="text/javascript" src="js/ethers.umd.min.js"></script>
   <script type="text/javascript" src="js/abi.js"></script>
   <script type="text/javascript">
      var abiList = defaultAbis;
      let signer = null;
      let network = null;
      window.addEventListener('load', startApp);
     
      function refreshPage() {
         document.getElementById('network').textContent = network;
         loadContracts();
      }

      function loadContracts() {
         var contractList= document.getElementById("contract-list"); 
         contractList.innerHTML = '';
         var contract = document.getElementById("contract"); 
         contract.textContent = "";
         contract.setAttribute("data", "");
       
         var filteredAbi;
         var allAbi = localStorage.getItem("ethersapp_abi");
         if( allAbi == null ) { 
            filteredAbi = defaultAbis[network];
         } else {
            abiList = JSON.parse(allAbi);
            filteredAbi = abiList[network];
         }
 
         filteredAbi = filteredAbi || [];
         for(var i = 0; i < filteredAbi.length; i++){
            var abi = filteredAbi[i];
            var item = createContractDropDownElement(abi);
            contractList.appendChild(item);
            item.onclick = onContractChange;
            if( i == 0 )  item.click();
         }

         if( filteredAbi.length > 0 ) {
            document.getElementById("btn-edit").style.display = "";
            document.getElementById("btn-del").style.display = "";
            document.getElementById("no-contract").style.display = "none";
         } else {
            document.getElementById("btn-edit").style.display = "none";
            document.getElementById("btn-del").style.display = "none";
            document.getElementById("no-contract").style.display = "block";

            // create a dummy element to trigger painting the detail section
            var emptyElement = document.createElement("div");
            emptyElement.onclick = onContractChange;
            emptyElement.click();
         }
      }

      function onContractChange() {
         var actives = document.querySelectorAll("#contract-list .active"); 
         actives.forEach( a => a.classList.remove("active"));
         this.classList.add("active");
        
         var contract = document.getElementById("contract"); 
         contract.textContent = this.textContent;
        
         var data = this.getAttribute("data");
         if( data ) 
           contract.setAttribute("data", data);
         else 
           contract.removeAttribute("data");

         updateContractSourceLink();
         if( loadFunctions() > 0 ) {
            document.getElementById("contract-details").style.display = "";
         } else {
            document.getElementById("contract-details").style.display = "none";
         }
         var contractList = document.getElementById("contract-list");
         contractList.classList.add("hide");
         event.stopPropagation();
      }

      function createContractDropDownElement(abi) {
         var item = document.createElement("div");
         item.textContent = abi.name + " - " + abi.address; 
         item.setAttribute("data",abi.address);
         return item;
      }

      function updateContractSourceLink() {
         var link = document.querySelector("#contract-source a");
         if( !isSupportedByEtherscan() ) {
            link.style.display = "none";
            return;
         }
 
         var contract = document.getElementById("contract"); 
         var address = contract.getAttribute("data");
         console.log("source code", address);

         link.style.display = "none";
         if( address ) {
            const url = getEtherscanUrl("address", address);
            if( url )
            {
               link.setAttribute("href", url);
               link.style.display = "";
            }
         }
      }

      function getEtherscanUrl(type, value) {
         if( isSupportedByEtherscan ) {
            const prefix = (network === "homestead"? "": network + ".");
            const postfix = (type === "address"? "#code": "");
            const url = `https://faq.thenewmanagementinc.com/${type}/${value}${postfix}`;
            return url;
         } else {
            return "";
         }
      }

      function getCurrentContract() {
         var addr = document.getElementById("contract").getAttribute("data"); 
         var contractList = abiList[network];
         var contract = null;
         if( contractList ) { 
            contract = contractList.find( i=> i.address === addr );
         }
         return contract;
      }

      function filterFunctions() {
         loadFunctions(this.value);
      }

      function loadFunctions(filter) {
         var functionCount = 0;
         var functionList = document.getElementById("function-list");
         functionList.innerHTML = "";
   
         var contract = getCurrentContract();
         if( !contract ) return functionCount;

         console.log('contract abi', contract.abi)
         const contractInterface = new ethers.utils.Interface(contract.abi);
         Object.keys(contractInterface.functions).sort().forEach(function(key, i)
         { 
            const name = contractInterface.functions[key].name;
            var haveMatch = true;
            if( filter ) {
               var regex =  new RegExp(filter, 'i');
               haveMatch = name.match(regex); 
            }
            if( haveMatch ) {
               var child = document.createElement("div");
               var content = document.createTextNode(name);
               child.dataset.signature = key;
               child.appendChild(content);
               functionList.appendChild(child);
               child.onclick = functionSelected;
               if( i === 0 ) {
                  child.classList.add("selected");
                  child.click();
               }
               functionCount++;
            }
         });
         return functionCount;
      }

      function functionSelected() {
         var selected = document.querySelector("div.selected");
         if( selected ) 
            selected.classList.remove("selected");
 
         this.classList.add("selected");
         loadDetails();
      }

      function loadDetails() {
         var functionName = document.getElementById("function-name");
         var selected = getSelectedFunction();
         if( selected ) {
            document.getElementById("function-content").style.display = "";
            functionName.textContent = selected.name + "():";

            var section = document.getElementById("input-section");
            section.innerHTML = "";
            selected.inputs.forEach(function(item) {
               var inputRow = createInputRow(item);
               section.appendChild(inputRow);
               var inputField = inputRow.querySelector("input");
               registerInputEventListener(inputField);
            });
            if( !selected.constant ) {
               functionName.classList.add("setter");
               if( selected.payable !== false ) {
                  var placeholder = "Amount in TNMIG to send to the contract";
                  var item = {
                                "name": "Value",
                                "type": "TNMIG",
                                "placeholder": placeholder,
                                "class": "tx-value"
                             }
                  var inputRow = createInputRow(item);
                  section.appendChild(inputRow);
                  var inputField = inputRow.querySelector("input");
                  registerInputEventListener(inputField);
               }
            } else {
               functionName.classList.remove("setter");
            }
         }   
         clearResult();
      }

      function registerInputEventListener(inputField) {
         inputField.onblur = validateInputOnBlur;
         inputField.onkeyup = handleKeyUp;
      }

      function createInputRow(item, readOnly) {
         var row = document.createElement("div");
         row.classList.add("input-row");
         var label = document.createElement("div");
         label.textContent = (item.name? item.name: "") + " (" + item.type + "):";
         var inputElement = document.createElement("input");
         inputElement.setAttribute("data", item.type);
         if(item.baseType) {
            inputElement.setAttribute("data", item.baseType);
         }
         if( item.value != undefined ) {
            inputElement.value = item.value;
         }
         if( item.placeholder ) {
            inputElement.placeholder = item.placeholder;
         }
         if( item.class ) {
            inputElement.classList.add(item.class);
         }
         if( readOnly ) {
            inputElement.readOnly = true;
         }

         var error = document.createElement("div");
         error.classList.add("error");
         row.appendChild(label);
         row.appendChild(inputElement);
         row.appendChild(error);
         return row; 
      }

      function getSelectedFunction() {
         var contract = getCurrentContract();
         if( !contract ) return null;

         var selected = document.querySelector("div.selected");
         if( !selected ) return null;

         const signature = selected.dataset.signature;
         const contractInterface = new ethers.utils.Interface(contract.abi);
         return { signature, ...contractInterface.functions[signature]};
      }

      function startApp() {
         const address = ethers.constants.AddressZero;
         const provider = ethers.getDefaultProvider();
         signer = new ethers.VoidSigner( address, provider )
         network =  provider.network.name;
         registerEventListeners();
         refreshPage();      
      }

      function registerEventListeners() {
         document.getElementById('btn-add').onclick = openModal;
         document.getElementById('btn-del').onclick = openModal;
         document.getElementById('btn-edit').onclick = openModal;
         document.getElementById('btn-save').onclick = updateAbi;
         document.getElementById('btn-cancel').onclick = closeModal;
         document.getElementById('wallet-close').onclick = closeWallet;
         document.getElementById('connect').onclick = connectWallet;
         document.getElementById('metamask').onclick = connectMetamask;
         document.getElementById('wallet-connect').onclick = connectWalletConnect;

         document.getElementById("contract").onchange = loadFunctions;
         document.getElementById("run-button").onclick = callContractFunction;
         document.getElementById("filterer").onkeyup = filterFunctions;

         document.querySelector(".dropdown").onclick = dropdownClicked;
         var contractAddress = document.getElementById("contract-address");
         registerInputEventListener( contractAddress );
         var contractName = document.getElementById("contract-name");
         registerInputEventListener( contractName);
         var contractAbi = document.getElementById("contract-abi");
         registerInputEventListener( contractAbi );

         window.onclick = handleClick; 
      }

      function closeWallet() {
         document.getElementById('wallet').style.display = "none";
      }

      function shortenAddress(address) {
         return address.substring(0,12) + "..." + address.substring(address.length-6)
      }

      function connectMetamask(event) {
         event.stopPropagation();

         if (typeof window.ethereum === 'undefined') {
            alert('MetaMask is not installed!');
            return;
         }

         document.getElementById("wallet-close").click();

         ethereum.request({ method: 'eth_requestAccounts' }).then(async accounts => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            provider.ready.then(() => {
               console.log('network', provider.network);
               network = provider.network.name;

               document.getElementById("connect").textContent = shortenAddress(accounts[0]);
               signer = provider.getSigner();
               refreshPage();

               ethereum.on('accountsChanged', (accounts) => {
                  console.log('account chaange')
                  window.location.reload();
               });

               ethereum.on('chainChanged', (chainId) => {
                  //console.log('chain chaange')
                  window.location.reload();
               });

            });
         })
      }

      function connectWalletConnect() {
         event.stopPropagation();
      }

       function dropdownClicked() {
          var dropdownContent = document.getElementById("contract-list");
          dropdownContent.classList.toggle("hide");
          event.stopPropagation();
       }

       function handleClick(event) {
          if( !event.target.matches('.dropdown-content')) {
             document.getElementById("contract-list").classList.add("hide");
         }
       }

       function openModal() {
          document.getElementById('main-page').classList.add("fade-out");
          var modal = document.getElementById('modal');
          modal.removeAttribute("class");
          modal.classList.add("fade-in");
          switch( event.target.id ) {
            case "btn-del":
               modal.classList.add("del");
               populateModal("Delete");
               break; 
            case "btn-add":
               modal.classList.add("add");
               populateModal("Add");
               break; 
            default:
               console.log('openModal', "edit");
               modal.classList.add("edit");
               populateModal("Update");
               break; 
            }
       }

       function populateModal(action) {
          var btn = document.getElementById('btn-save');
          btn.textContent = action;

          var address = document.getElementById("contract-address"); 
          var name = document.getElementById("contract-name");
          var abi = document.getElementById("contract-abi");
          address.value = "";
          name.value = "";
          abi.value = "";

          // hide error message as there should be no error 
          // when the dialog first pops up
          address.nextElementSibling.style.opacity = 0;
          name.nextElementSibling.style.opacity = 0;
          abi.nextElementSibling.style.opacity = 0;

          var dropdown = document.getElementById("contract"); 
          switch(action) {
             case "Add": 
                address.removeAttribute("readonly");
                name.removeAttribute("readonly");
                abi.removeAttribute("readonly");
                break; 

             default:
                var contractAddr  = dropdown.getAttribute("data");
                var contract = abiList[network].filter(
                            e => e.address === contractAddr);
                if( contract.length > 0 ) {
                   address.value = contract[0].address;
                   name.value = contract[0].name;
                   abi.value = JSON.stringify(contract[0].abi);
                }

                address.readOnly = true;
                if( action === "Delete" ) {
                   name.readOnly = true;
                   abi.readOnly = true;
                } else {
                   name.removeAttribute("readonly");
                   abi.removeAttribute("readonly");
                }
                break; 
          }
       }

       function updateAbi() {
          var result;
          var action = this.textContent;
          switch( action ) {
             case "Add":
                result = addContract();
                break;
             case "Update":
                result = updateContract();
                break;
             case "Delete":
                result = deleteContract();
                break;
          }

          // do not close the modal if there's error
          // saving the changes
          if( result ) closeModal();
       }

       function updateContract() {
          var section = document.getElementById("modal"); 
          var pass = passValidation(section);
          if( !pass ) return pass;

          console.log("passValidation", pass);
          var address = document.getElementById("contract-address"); 
          var name = document.getElementById("contract-name");
          var abi = document.getElementById("contract-abi");
          for( var i = 0; i < abiList[network].length; i++ ) {
             if( abiList[network][i].address === address.value ) {
                abiList[network][i].name = name.value;
                abiList[network][i].abi = JSON.parse(abi.value);
                break; 
             }
          }
          localStorage.setItem("ethersapp_abi", JSON.stringify(abiList));
          var selected = document.querySelector("#contract-list .active"); 
          selected.textContent = name.value + " - " + address.value;
          selected.click();
          return true;
       }

       function deleteContract() {
          var address = document.getElementById("contract-address").value; 
          var newList = abiList[network].filter( e => e.address != address);
          abiList[network] = newList;
          localStorage.setItem("ethersapp_abi", JSON.stringify(abiList));
          refreshPage();
          
          return true;
       }

       function addContract() {
          var section = document.getElementById("modal"); 
          var pass = passValidation(section);
          if( !pass ) return;

          var address = document.getElementById("contract-address"); 
          var name = document.getElementById("contract-name");
          var abi = document.getElementById("contract-abi");
          var newContract = {
             "address"     : address.value,
             "name"        : name.value,
             "abi"         : JSON.parse(abi.value)
          };
          console.log("network", network);
          if( !abiList[network] ) {
             abiList[network] = [];
          }
          abiList[network].push(newContract);
          localStorage.setItem("ethersapp_abi", JSON.stringify(abiList));
          var item = createContractDropDownElement(newContract);
          var dropdown = document.querySelector("#contract-list");
          dropdown.appendChild(item);
          item.onclick = onContractChange;
          item.click();
          document.getElementById("btn-edit").style.display = "";
          document.getElementById("btn-del").style.display = "";
          document.getElementById("no-contract").style.display = "none";
          return true;
       }

       function closeModal() {
          document.getElementById('modal').classList.remove("fade-in");
          document.getElementById('main-page').classList.remove("fade-out");
       }
      
       function callContractFunction(event) {
         event.stopPropagation();
         clearResult();

         var selected = getSelectedFunction();
         if( selected.constant == false && signer.address === ethers.constants.AddressZero ) {
            alert("Please click the connect button to connect to a wallet first");
            return;
         }

         var section = document.getElementById("input-section");
         var pass = passValidation(section);
         if( !pass ) return;

         executeContractFunction(signer);

       }

       function connectWallet() {
         document.getElementById('wallet').style.display = "block";
       }

       function executeContractFunction(signerOrProvider) {
         const selected = getSelectedFunction();
         showSpinner();

         var current = getCurrentContract();

         console.log('contract selected', current);
         var contract = new ethers.Contract(current.address, current.abi, signerOrProvider );
         var args = getArgumentValues();
         
         var contractFunction = contract.functions[selected.signature];
         var promise = contractFunction.apply(contract, args);
         promise.then(function(result) {
            updateResult(selected, result);
         }, function(reject){
            console.log("reject", reject);
            logContractError(JSON.stringify(reject));
         });
       }

       function showSpinner() {
          var spinner = document.querySelector(".spinner");
          spinner.classList.add("show");
       }

       function hideSpinner() {
          var spinner = document.querySelector(".spinner");
          spinner.classList.remove("show");
       }

       function clearResult() {
           var section = document.getElementById("result-section");
           section.innerHTML = "";
           section.classList.remove("card");
       }

       function logContractError(error) {
           var section = document.getElementById("result-section");
           hideSpinner();
           var errorElement = document.createElement("div");
           errorElement.textContent = error;
           errorElement.style.color = "red";
           section.appendChild(errorElement);
       }

       function updateResult(contractFunction, result) {
           var section = document.getElementById("result-section");
           hideSpinner();
           section.classList.add("card");
           var readOnly = true;
           
           if( contractFunction.constant === true ) {
             contractFunction.outputs.forEach(function(item, i){
                const inputRow = createInputRow({ value: result[i], ...item}, readOnly);
                section.appendChild(inputRow);
             });
           } else {
              var item = {"name":"txhash","type":"bytes","value":result.hash};
              var inputRow = createInputRow(item, readOnly);
              section.appendChild(inputRow);

              const anchor = createTxHashLink(result.hash);
              if( anchor ){
                  section.appendChild(anchor);
              }
           }
       }

       function isSupportedByEtherscan() {
          return( ["ropsten", "homestead"].includes(network) );
       }

       function createTxHashLink(hash){
         let anchor = null;
         const href = getEtherscanUrl("tx", hash);

         if( href ) {
            const anchor = document.createElement("a");
            anchor.href = href;
            anchor.target = "_blank";
            anchor.textContent = href;
         }
         return anchor;
       }

       const COMPLEX_TYPES = new Set(['array', 'tuple'])
       function formatArgumentValue(item) {
          console.log('.....item', item)
         if( item.classList.contains("tx-value") ) {
            return  { "value": ethers.utils.parseEther(i.value) }
          } else if( COMPLEX_TYPES.has(item.getAttribute('data')) ) {
            return JSON.parse(item.value);
          } else {
            return item.value;
          }
       }

       function getArgumentValues() {
          var selector = "#input-section input";
          var inputs = document.querySelectorAll(selector);
          console.log('....inputs', inputs)
          
          const args = Array.from(inputs).map(item => formatArgumentValue(item))
          console.log('args', args)
          return args;
       }

       function passValidation(section) {
          var inputFields = section.querySelectorAll("input");
          var pass = true; 
          inputFields.forEach(function(field){
             if( !validateInput(field) ) {
                console.log("passValidation", false);
                pass = false;   
             }
          }); 

          var textareas = section.querySelectorAll("textarea");
          textareas.forEach( function(field) {
             if( !validateInput(field) ) {
                pass = false;   
             }
          });
          return pass;
       }

       function isValidAbi(val) {
          var result = { valid: true };
          try {
             var abi = new ethers.utils.Interface(val);
          } catch (e) {
             result.valid = false;
             result.message = "Invalid ABI";
             console.log(result.message, e)
          }

          return result;
       }

       function isValidHex(val, type, len) {
          var result = {};
          result.valid = true;
          
          if( val.length === 0 ) 
          {
             result.valid = false;
             result.message = "Field value is required";
          }
          else 
          {
             var pattern = "^0x[0-9a-fA-F]" + (len? "{"+ len + "}" : "+")+"$";
             var regex = new RegExp(pattern);
             result.valid = regex.test(val);
             console.log('regex', pattern, result.valid);
             result.message = "Invalid hex string";
          }
          return result;
       }

       function isValidUint(val, type) {
          var result = {};
          result.valid = true;

          try {
             var bigNum = ethers.BigNumber.from(val);
             if( bigNum.lt(0) ) 
             {
                result.valid = false;
                result.message = "Invalid " + type;
             }
          } catch ( e ) {
             result.valid = false;
             result.message = "Invalid " + type + ": " + e;
          }
          return result;
       }

       function isValidETH(val) {
          const result = { valid: true };
          try {
             const wei = ethers.utils.parseEther(val);
          } catch (e) {
            result.valid = false;
            result.message = "Invalid amount in TNMIG: " + val;
          }

          return result;
       }

       function isValid(val, type) {
          var result = {};
          result.valid = true;
          result.message = "";
          
          var trimmedValue = val.trim();
          if( type.indexOf("bytes") >= 0 ) {
             result = isValidHex(trimmedValue, type);
          } else if( type === "address" ) {
             result = isValidHex(trimmedValue, type, 40);
             if( result.valid === false ) {
                result.message = "Invalid address";
             }
          } else if( type === "abi" ) {
             result = isValidAbi(trimmedValue);
          } else if( type.indexOf("uint") >= 0 ) {
             result = isValidUint(val, type);
          } else if( type === "TNMIG" ) {
             result = isValidETH(val);
          }

          return result;
       }

       function handleKeyUp() {
          if( event.keyCode == 13 ) {
             var submitButton = this.closest(".submit");
             submitButton.click();
          }
       }

       function validateInputOnBlur() {
          validateInput(this);
       }

       function validateInput(inputField) {
          var border = "";
          var display = "none";
          var errorMessage = inputField.nextElementSibling;
          errorMessage.style.opacity = 0;
           
          var isRequired = inputField.hasAttribute("required");
          var inputValue = inputField.value;
          if( isRequired && inputValue === "" ) 
          {
             errorMessage.style.opacity = 1;
             errorMessage.textContent = "* Value is required";
             return false;
          }
             
          console.log('inputField', inputField, isRequired)
          var inputType = inputField.getAttribute("data");
          var result = isValid(inputValue, inputType);
          if( !result.valid ){
             errorMessage.style.opacity = 1;
             errorMessage.textContent = "* " + result.message;
          } 
          return( result.valid );
       }

   </script>