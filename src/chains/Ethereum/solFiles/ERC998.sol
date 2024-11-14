    // SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract ERC998 is ERC165, IERC721 {
    using Address for address;

    string public name; // Name of the token
    string public symbol; // Symbol of the token
    bool public composable; // Flag indicating if the token is composable
    address public rootOwner; // Address of the root owner
    uint256 public rootId; // ID of the root token
    string public extension; // Extension name
    uint256 public extensionId; // Extension ID

    struct ChildToken {
        address contractAddress; // Address of the child token contract
        uint256 tokenId; // ID of the child token
    }

    mapping(uint256 => address) internal tokenOwners; // Mapping of token IDs to their owners
    mapping(uint256 => ChildToken[]) internal childTokens; // Mapping of token IDs to their child tokens
    mapping(address => mapping(address => bool)) private _operatorApprovals; // Mapping of operator approvals

    uint256 public totalChildTokens; // Total number of child tokens

    event ReceivedChild(address indexed from, uint256 indexed toTokenId, address indexed childContract, uint256 childTokenId); // Event emitted when a child token is received
    event TransferChild(uint256 indexed fromTokenId, address indexed to, address indexed childContract, uint256 childTokenId); // Event emitted when a child token is transferred

    constructor(string memory _name, string memory _symbol, bool _composable, address _rootOwner, uint256 _rootId, string memory _extension, uint256 _extensionId) {
        name = _name;
        symbol = _symbol;
        composable = _composable;
        rootOwner = _rootOwner;
        rootId = _rootId;
        extension = _extension;
        extensionId = _extensionId;
    }

    function balanceOf(address owner) public view override returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < totalChildTokens; i++) {
            if (childTokens[i].length > 0 && tokenOwners[i] == owner) {
                count++;
            }
        }
        return count;
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = tokenOwners[tokenId];
        require(owner != address(0), "ERC998: invalid token ID");
        return owner;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC998: caller is not owner nor approved");
        _safeTransferFrom(from, to, tokenId, data);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC998: caller is not owner nor approved");
        _transferFrom(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) public override {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC998: approval to current owner");
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "ERC998: approve caller is not owner nor approved for all");
        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_exists(tokenId), "ERC998: approved query for nonexistent token");
        return childTokens[tokenId][0].contractAddress;
    }

    function setApprovalForAll(address operator, bool approved) public override {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function rootOwnerOf(uint256 tokenId) public view returns (address) {
        return tokenOwners[tokenId];
    }

    function rootOwnerOfChild(address childContract, uint256 childTokenId) public view returns (address) {
        uint256 tokenId = totalChildTokens;
        for (uint256 i = 0; i < totalChildTokens; i++) {
            ChildToken[] storage children = childTokens[i];
            for (uint256 j = 0; j < children.length; j++) {
                if (children[j].contractAddress == childContract && children[j].tokenId == childTokenId) {
                    tokenId = i;
                    break;
                }
            }
            if (tokenId != totalChildTokens) {
                break;
            }
        }
        require(tokenId != totalChildTokens, "ERC998: child token not found");
        return tokenOwners[tokenId];
    }

    function onERC721Received(address from, uint256 childTokenId, bytes memory data) public virtual returns (bytes4) {
        require(data.length == 32, "ERC998: data must contain the parent tokenId");
        uint256 toTokenId = abi.decode(data, (uint256));
        require(_exists(toTokenId), "ERC998: token does not exist");
        childTokens[toTokenId].push(ChildToken(msg.sender, childTokenId));
        totalChildTokens++;
        emit ReceivedChild(from, toTokenId, msg.sender, childTokenId);
        return this.onERC721Received.selector;
    }

    function transferChild(uint256 fromTokenId, address to, address childContract, uint256 childTokenId) external {
        require(_exists(fromTokenId), "ERC998: token does not exist");
        require(msg.sender == ownerOf(fromTokenId) || isApprovedForAll(ownerOf(fromTokenId), msg.sender), "ERC998: caller is not owner nor approved");

        ChildToken[] storage children = childTokens[fromTokenId];
        uint256 childIndex = children.length;
        for (uint256 i = 0; i < children.length; i++) {
            if (children[i].contractAddress == childContract && children[i].tokenId == childTokenId) {
                childIndex = i;
                break;
            }
        }
        require(childIndex != children.length, "ERC998: child token not owned by the parent token");

        children[childIndex] = children[children.length - 1];
        children.pop();
        totalChildTokens--;

        IERC721(childContract).safeTransferFrom(address(this), to, childTokenId);
        emit TransferChild(fromTokenId, to, childContract, childTokenId);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenOwners[tokenId] != address(0);
    }

    function _transferFrom(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "ERC998: transfer of token that is not own");
        require(to != address(0), "ERC998: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId);

        _approve(address(0), tokenId);
        tokenOwners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) internal {
        _transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "ERC998: transfer to non ERC721Receiver implementer");
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual {}

    function _approve(address to, uint256 tokenId) internal {
        childTokens[tokenId].push(ChildToken(to, 0));
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory _data) private returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(to)
        }
        if (size > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, _data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC998: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC721).interfaceId || super.supportsInterface(interfaceId);
    }
}