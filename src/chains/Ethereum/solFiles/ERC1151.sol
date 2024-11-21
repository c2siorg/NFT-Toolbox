// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

interface IERC1151Receiver {
    function onERC1151Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

contract MyERC1151 is Context, ERC165 {
    using Address for address;
    using Strings for uint256;

    string private _name;
    string private _symbol;
    string private _baseUri;

    mapping(uint256 => address) private _nftOwners;
    mapping(address => uint256) private _ownerToNFTCount;
    mapping(uint256 => address) private _nftApprovals;
    mapping(uint256 => uint256) private _nftBalances;
    mapping(uint256 => string) private _nftData;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseUri_
    ) {
        _name = name_;
        _symbol = symbol_;
        _baseUri = baseUri_;
    }

    function balanceOf(address owner) public view virtual returns (uint256) {
        require(owner != address(0), "ERC1151: balance query for the zero address");
        return _ownerToNFTCount[owner];
    }

    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        address owner = _nftOwners[tokenId];
        require(owner != address(0), "ERC1151: owner query for nonexistent token");
        return owner;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view virtual returns (string memory) {
        require(_exists(tokenId), "ERC1151: URI query for nonexistent token");
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    function _baseURI() internal view virtual returns (string memory) {
        return _baseUri;
    }

    function approve(address to, uint256 tokenId) public virtual {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC1151: approval to current owner");
        require(_msgSender() == owner || isApprovedForAll(owner, _msgSender()), "ERC1151: approve caller is not owner nor approved for all");
        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view virtual returns (address) {
        require(_exists(tokenId), "ERC1151: approved query for nonexistent token");
        return _nftApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public virtual {
        require(operator != _msgSender(), "ERC1151: approve to caller");
        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view virtual returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC1151: transfer caller is not owner nor approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public virtual {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC1151: transfer caller is not owner nor approved");
        _safeTransfer(from, to, tokenId, _data);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory _data) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC1151Received(from, to, tokenId, _data), "ERC1151: transfer to non-ERC1151Receiver implementer");
    }

    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _nftOwners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        require(_exists(tokenId), "ERC1151: operator query for nonexistent token");
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    function _safeMint(address to, uint256 tokenId, bytes memory _data) internal virtual {
        _mint(to, tokenId);
        require(_checkOnERC1151Received(address(0), to, tokenId, _data), "ERC1151: transfer to non-ERC1151Receiver implementer");
    }

    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC1151: mint to the zero address");
        require(!_exists(tokenId), "ERC1151: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _nftOwners[tokenId] = to;
        _ownerToNFTCount[to] += 1;

        emit Transfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual {
        address owner = ownerOf(tokenId);

        _beforeTokenTransfer(owner, address(0), tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _ownerToNFTCount[owner] -= 1;
        delete _nftOwners[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal virtual {
        require(ownerOf(tokenId) == from, "ERC1151: transfer of token that is not own");
        require(to != address(0), "ERC1151: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _ownerToNFTCount[from] -= 1;
        _ownerToNFTCount[to] += 1;
        _nftOwners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _approve(address to, uint256 tokenId) internal virtual {
        _nftApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _checkOnERC1151Received(address from, address to, uint256 tokenId, bytes memory _data) private returns (bool) {
        if (to.code.length > 0) {
            try IERC1151Receiver(to).onERC1151Received(_msgSender(), from, tokenId, _data) returns (bytes4 retval) {
                return retval == IERC1151Receiver.onERC1151Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC1151: transfer to non-ERC1151Receiver implementer");
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

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual {}
}